import { Injectable } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { canRunAction } from '../common/action-policy';
import type { AuthenticatedUser } from '../common/types';

export type AccessScope = 'ALL' | 'BRANCH' | 'TEAM' | 'OWN' | 'NONE';

const SCOPE_RANK: Record<AccessScope, number> = { NONE: 0, OWN: 1, TEAM: 2, BRANCH: 3, ALL: 4 };

/**
 * Central RBAC resolver (docs/03 §3.3). Combines:
 *  - the static action policy (common/action-policy.ts) for workflow actions, and
 *  - the resource-level `permissions` matrix in PostgreSQL for CRUD scoping.
 *
 * The permission matrix is cached in-process and refreshed lazily; it is small
 * and changes rarely (seeded data).
 */
@Injectable()
export class PermissionEngine {
  private cache: Map<string, AccessScope> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Whether a role may run a workflow action (static policy). */
  canRunAction(role: UserRole, actionType: string): boolean {
    return canRunAction(role, actionType);
  }

  /** Resolve the visibility scope a role has for a resource+action. */
  async resolveScope(role: UserRole, resource: string, action: string): Promise<AccessScope> {
    const matrix = await this.load();
    return matrix.get(this.key(role, resource, action)) ?? 'NONE';
  }

  /** True if the role has at least the minimum scope for the resource+action. */
  async can(role: UserRole, resource: string, action: string, min: AccessScope = 'OWN'): Promise<boolean> {
    const scope = await this.resolveScope(role, resource, action);
    return SCOPE_RANK[scope] >= SCOPE_RANK[min];
  }

  /**
   * Build a Prisma `where` fragment that enforces row-level visibility for the
   * given user, based on their scope. Returns `{}` for ALL, an impossible
   * filter for NONE.
   */
  async scopeFilter(
    user: AuthenticatedUser,
    resource: string,
    action: string,
    fields: { ownerField?: string; branchField?: string } = {},
  ): Promise<Record<string, unknown>> {
    const scope = await this.resolveScope(user.role, resource, action);
    const { ownerField = 'assignedToId', branchField = 'branchId' } = fields;
    switch (scope) {
      case 'ALL':
        return {};
      case 'BRANCH':
        return user.branchId ? { [branchField]: user.branchId } : { id: '__none__' };
      case 'TEAM':
      case 'OWN':
        return { [ownerField]: user.id };
      case 'NONE':
      default:
        return { id: '__none__' };
    }
  }

  invalidate(): void {
    this.cache = null;
  }

  private async load(): Promise<Map<string, AccessScope>> {
    if (this.cache) {
      return this.cache;
    }
    const rows = await this.prisma.permission.findMany();
    const map = new Map<string, AccessScope>();
    for (const row of rows) {
      map.set(this.key(row.role, row.resource, row.action), row.scope as AccessScope);
    }
    this.cache = map;
    return map;
  }

  private key(role: UserRole, resource: string, action: string): string {
    return `${role}:${resource}:${action}`;
  }
}
