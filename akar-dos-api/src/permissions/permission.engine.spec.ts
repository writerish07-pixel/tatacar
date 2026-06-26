import { PermissionEngine } from './permission.engine';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/types';

/** Minimal Prisma stub exposing only what the engine reads. */
function stubPrisma(rows: Array<{ role: string; resource: string; action: string; scope: string }>): PrismaService {
  return {
    permission: {
      findMany: jest.fn().mockResolvedValue(rows),
    },
  } as unknown as PrismaService;
}

const GM: AuthenticatedUser = { id: 'gm-1', salesTeamId: 'GM_01', name: 'GM', role: 'GM', branchId: 'b1' };
const SALES: AuthenticatedUser = { id: 'sales-1', salesTeamId: 'SALES_01', name: 'S', role: 'SALES', branchId: 'b1' };
const EVM: AuthenticatedUser = { id: 'ev-1', salesTeamId: 'EV_MANAGER_01', name: 'E', role: 'EV_MANAGER', branchId: 'b1' };

describe('PermissionEngine', () => {
  const matrix = [
    { role: 'GM', resource: 'user', action: 'READ', scope: 'ALL' },
    { role: 'EV_MANAGER', resource: 'user', action: 'READ', scope: 'BRANCH' },
    { role: 'SALES', resource: 'user', action: 'READ', scope: 'OWN' },
  ];

  it('resolves the configured scope for a role', async () => {
    const engine = new PermissionEngine(stubPrisma(matrix));
    await expect(engine.resolveScope('GM', 'user', 'READ')).resolves.toBe('ALL');
    await expect(engine.resolveScope('SALES', 'user', 'READ')).resolves.toBe('OWN');
    await expect(engine.resolveScope('SALES', 'user', 'DELETE')).resolves.toBe('NONE');
  });

  it('ranks scopes: ALL satisfies a BRANCH minimum but OWN does not', async () => {
    const engine = new PermissionEngine(stubPrisma(matrix));
    await expect(engine.can('GM', 'user', 'READ', 'BRANCH')).resolves.toBe(true);
    await expect(engine.can('SALES', 'user', 'READ', 'BRANCH')).resolves.toBe(false);
  });

  it('builds an unscoped filter for ALL and an owner filter for OWN', async () => {
    const engine = new PermissionEngine(stubPrisma(matrix));
    await expect(engine.scopeFilter(GM, 'user', 'READ', { ownerField: 'id' })).resolves.toEqual({});
    await expect(engine.scopeFilter(SALES, 'user', 'READ', { ownerField: 'id' })).resolves.toEqual({ id: SALES.id });
  });

  it('builds a branch filter for BRANCH scope', async () => {
    const engine = new PermissionEngine(stubPrisma(matrix));
    await expect(engine.scopeFilter(EVM, 'user', 'READ', { branchField: 'branchId' })).resolves.toEqual({
      branchId: EVM.branchId,
    });
  });

  it('caches the matrix and queries the database once', async () => {
    const prisma = stubPrisma(matrix);
    const engine = new PermissionEngine(prisma);
    await engine.resolveScope('GM', 'user', 'READ');
    await engine.resolveScope('SALES', 'user', 'READ');
    expect((prisma.permission.findMany as jest.Mock).mock.calls).toHaveLength(1);
  });
});
