import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ACTION_ROLES } from '../common/action-policy';

/**
 * Read-only RBAC introspection (GM/OWNER). Exposes the role catalogue, the
 * resource permission matrix, and the workflow action policy.
 */
@Controller()
@Roles(UserRole.GM, UserRole.OWNER)
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('roles')
  roles() {
    return { roles: Object.values(UserRole) };
  }

  @Get('permissions')
  async permissions() {
    const matrix = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }, { role: 'asc' }],
    });
    return { matrix, actionPolicy: ACTION_ROLES };
  }
}
