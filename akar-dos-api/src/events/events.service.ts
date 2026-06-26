import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface DomainEventInput {
  eventType: string;
  aggregate: string;
  aggregateId?: string | null;
  payload: Prisma.InputJsonValue;
  actorId?: string | null;
}

/**
 * Append-only domain event store (ADR-003, docs/05 DEC-017). Every material
 * state change emits an event here; cross-context coordination is built on top
 * of it in later milestones.
 */
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async emit(event: DomainEventInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.domainEvent.create({
      data: {
        eventType: event.eventType,
        aggregate: event.aggregate,
        aggregateId: event.aggregateId ?? null,
        payload: event.payload,
        actorId: event.actorId ?? null,
      },
    });
  }
}
