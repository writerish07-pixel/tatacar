import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';
import { EventsService } from '../events/events.service';
import { PermissionEngine } from '../permissions/permission.engine';
import { PaginatedResult, type PaginationQueryDto } from '../common/dto/pagination';
import type { AuthenticatedUser } from '../common/types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/** Fields safe to return — never includes passwordHash (docs/07 §9). */
const USER_SELECT = {
  id: true,
  salesTeamId: true,
  name: true,
  email: true,
  role: true,
  branchId: true,
  vehicleType: true,
  teamId: true,
  teamLeaderId: true,
  managerId: true,
  hierarchyLevel: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
    private readonly permissions: PermissionEngine,
  ) {}

  async list(actor: AuthenticatedUser, query: PaginationQueryDto): Promise<PaginatedResult<unknown>> {
    const where = (await this.permissions.scopeFilter(actor, 'user', 'READ', {
      ownerField: 'id',
      branchField: 'branchId',
    })) as Prisma.UserWhereInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return PaginatedResult.of(rows, total, query.page, query.pageSize);
  }

  async get(id: string): Promise<unknown> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(actor: AuthenticatedUser, dto: CreateUserDto): Promise<unknown> {
    const existing = await this.prisma.user.findUnique({ where: { salesTeamId: dto.salesTeamId } });
    if (existing) {
      throw new ConflictException('A user with this salesTeamId already exists');
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const created = await this.prisma.user.create({
      data: {
        salesTeamId: dto.salesTeamId,
        name: dto.name,
        passwordHash,
        role: dto.role,
        email: dto.email ?? null,
        vehicleType: dto.vehicleType ?? 'ALL',
        branchId: dto.branchId ?? actor.branchId ?? null,
        hierarchyLevel: dto.hierarchyLevel ?? 5,
      },
      select: USER_SELECT,
    });

    await this.audit.record({
      entityType: 'user',
      entityId: created.id,
      event: 'user.created',
      actorId: actor.id,
      newValue: { salesTeamId: dto.salesTeamId, role: dto.role },
    });
    await this.events.emit({
      eventType: 'user.created',
      aggregate: 'user',
      aggregateId: created.id,
      payload: { salesTeamId: dto.salesTeamId, role: dto.role },
      actorId: actor.id,
    });

    return created;
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateUserDto): Promise<unknown> {
    const before = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!before) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
        vehicleType: dto.vehicleType,
        teamLeaderId: dto.teamLeaderId,
        managerId: dto.managerId,
      },
      select: USER_SELECT,
    });

    await this.audit.record({
      entityType: 'user',
      entityId: id,
      event: 'user.updated',
      actorId: actor.id,
      oldValue: before as unknown as Prisma.InputJsonValue,
      newValue: updated as unknown as Prisma.InputJsonValue,
    });
    await this.events.emit({
      eventType: 'user.updated',
      aggregate: 'user',
      aggregateId: id,
      payload: { changed: Object.keys(dto) },
      actorId: actor.id,
    });

    return updated;
  }
}
