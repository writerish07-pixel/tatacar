import { Injectable } from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

export interface CreateTaskInput {
  title: string;
  description?: string;
  type: string;
  assignedToId: string;
  priority?: TaskPriority;
  entityType?: string;
  entityId?: string;
  actionType?: string;
  dueAt?: Date;
  createdById?: string;
}

export interface MyWork {
  actionRequired: unknown[];
  overdue: unknown[];
  dueToday: unknown[];
  completedToday: unknown[];
}

/**
 * Task queue powering the My Work dashboard (Master Spec §11.2). Foundation:
 * task creation helper (used by workflow handlers in later milestones) and the
 * My Work aggregation that buckets a user's tasks.
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async create(input: CreateTaskInput, tx?: Prisma.TransactionClient): Promise<{ id: string }> {
    const client = tx ?? this.prisma;
    const task = await client.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        assignedToId: input.assignedToId,
        priority: input.priority ?? TaskPriority.NORMAL,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        actionType: input.actionType ?? null,
        dueAt: input.dueAt ?? null,
        createdById: input.createdById ?? null,
      },
      select: { id: true },
    });
    await this.events.emit(
      {
        eventType: 'task.created',
        aggregate: 'task',
        aggregateId: task.id,
        payload: { type: input.type, assignedToId: input.assignedToId },
        actorId: input.createdById ?? null,
      },
      tx,
    );
    return task;
  }

  async myWork(userId: string): Promise<MyWork> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const openStatuses: TaskStatus[] = [TaskStatus.OPEN, TaskStatus.IN_PROGRESS];

    const [actionRequired, overdue, dueToday, completedToday] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where: { assignedToId: userId, status: { in: openStatuses }, OR: [{ dueAt: null }, { dueAt: { gt: endOfDay } }] },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.task.findMany({
        where: { assignedToId: userId, status: { in: openStatuses }, dueAt: { lt: startOfDay } },
        orderBy: { dueAt: 'asc' },
      }),
      this.prisma.task.findMany({
        where: { assignedToId: userId, status: { in: openStatuses }, dueAt: { gte: startOfDay, lte: endOfDay } },
        orderBy: { dueAt: 'asc' },
      }),
      this.prisma.task.findMany({
        where: { assignedToId: userId, status: TaskStatus.COMPLETED, completedAt: { gte: startOfDay, lte: endOfDay } },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    return { actionRequired, overdue, dueToday, completedToday };
  }

  async complete(userId: string, taskId: string): Promise<{ id: string; status: TaskStatus }> {
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.COMPLETED, completedAt: new Date() },
      select: { id: true, status: true, assignedToId: true },
    });
    await this.events.emit({
      eventType: 'task.completed',
      aggregate: 'task',
      aggregateId: taskId,
      payload: { by: userId },
      actorId: userId,
    });
    return { id: updated.id, status: updated.status };
  }
}
