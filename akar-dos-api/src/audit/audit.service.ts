import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  entityType: string;
  entityId?: string | null;
  event: string;
  actorId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  reason?: string | null;
  ipAddress?: string | null;
}

/**
 * Append-only audit trail (docs/07 §4, Master Spec §18). Exposes write-only
 * helpers — there is intentionally no update/delete API. Every material
 * mutation must call `record`.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        event: entry.event,
        actorId: entry.actorId ?? null,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        reason: entry.reason ?? null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  }
}
