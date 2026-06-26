import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationPriority, NotificationStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { PaginatedResult, type PaginationQueryDto } from '../common/dto/pagination';

export interface CreateNotificationInput {
  targetUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  actions?: Array<{ id: string; label: string; actionType: string }>;
}

/**
 * In-app notification framework (Master Spec §17). Persists notifications and
 * pushes them in real time via Socket.IO. Used by workflow handlers in later
 * milestones; the framework (persist + push + read/action) is complete here.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(input: CreateNotificationInput, tx?: Prisma.TransactionClient): Promise<{ id: string }> {
    const client = tx ?? this.prisma;
    const notification = await client.notification.create({
      data: {
        targetUserId: input.targetUserId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority ?? NotificationPriority.NORMAL,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        actionsJson: input.actions ? (input.actions as unknown as Prisma.InputJsonValue) : undefined,
      },
    });

    this.gateway.emitToUser(input.targetUserId, 'notification.created', notification);
    return { id: notification.id };
  }

  async listForUser(userId: string, query: PaginationQueryDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.NotificationWhereInput = { targetUserId: userId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return PaginatedResult.of(rows, total, query.page, query.pageSize);
  }

  async markRead(userId: string, id: string): Promise<{ id: string; status: NotificationStatus }> {
    await this.assertOwnership(userId, id);
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.READ, readAt: new Date() },
      select: { id: true, status: true },
    });
    return updated;
  }

  async action(userId: string, id: string): Promise<{ id: string; status: NotificationStatus }> {
    await this.assertOwnership(userId, id);
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.ACTIONED, readAt: new Date() },
      select: { id: true, status: true },
    });
    return updated;
  }

  private async assertOwnership(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.notification.findUnique({ where: { id }, select: { targetUserId: true } });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }
    if (existing.targetUserId !== userId) {
      throw new ForbiddenException('You cannot modify this notification');
    }
  }
}
