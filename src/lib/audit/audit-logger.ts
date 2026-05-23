import { randomUUID } from "node:crypto";
import type { UserId } from "../../domain/ids/user-id";
import type { InsForgeDatabaseGateway } from "../insforge/database-gateway";
import type { AuditEventRow } from "../insforge/schema";

export interface RecordAuditEventInput {
  readonly actorId: UserId | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly occurredOnUtc?: Date;
  readonly metadata?: Record<string, unknown>;
}

export class InsForgeAuditLogger {
  constructor(private readonly database: InsForgeDatabaseGateway) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    const row: AuditEventRow = {
      id: randomUUID(),
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      occurred_on_utc: (input.occurredOnUtc ?? new Date()).toISOString(),
      metadata: input.metadata ?? {},
    };
    await this.database.insertRows("audit_events", [row]);
  }
}
