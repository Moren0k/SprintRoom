import { describe, expect, it } from "vitest";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { ProjectId } from "../../../src/domain/ids/project-id";
import { UserId } from "../../../src/domain/ids/user-id";
import { UserStoryId } from "../../../src/domain/ids/user-story-id";
import { CommentBody } from "../../../src/domain/value-objects/comment-body";
import { Description } from "../../../src/domain/value-objects/description";
import { WorkItemName } from "../../../src/domain/value-objects/work-item-name";
import { InsForgeAuditLogger } from "../../../src/lib/audit/audit-logger";
import type {
  InsForgeDatabaseGateway,
  QueryFilter,
  SelectRowsOptions,
} from "../../../src/lib/insforge/database-gateway";
import { InsForgeUnitOfWork } from "../../../src/lib/insforge/unit-of-work";

class FakeAuditDatabaseGateway implements InsForgeDatabaseGateway {
  readonly tables = new Map<string, Record<string, unknown>[]>();

  async selectRows<T>(table: string, options: SelectRowsOptions = {}): Promise<T[]> {
    return this.table(table)
      .filter((row) => this.matches(row, options.filters ?? []))
      .map((row) => ({ ...row })) as T[];
  }

  async selectOne<T>(table: string, filters: ReadonlyArray<QueryFilter>): Promise<T | null> {
    return (await this.selectRows<T>(table, { filters }))[0] ?? null;
  }

  async insertRows<T extends object>(table: string, rows: ReadonlyArray<T>): Promise<void> {
    this.table(table).push(
      ...rows.map((row) => ({ ...(row as Record<string, unknown>) })),
    );
  }

  async upsertRows<T extends object>(table: string, rows: ReadonlyArray<T>): Promise<void> {
    await this.insertRows(table, rows);
  }

  async deleteRows(table: string, filters: ReadonlyArray<QueryFilter>): Promise<void> {
    this.tables.set(
      table,
      this.table(table).filter((row) => !this.matches(row, filters)),
    );
  }

  private table(name: string): Record<string, unknown>[] {
    const rows = this.tables.get(name) ?? [];
    this.tables.set(name, rows);
    return rows;
  }

  private matches(row: Record<string, unknown>, filters: ReadonlyArray<QueryFilter>): boolean {
    return filters.every((filter) => {
      if (filter.operator === "eq") return row[filter.column] === filter.value;
      return filter.value.includes(row[filter.column]);
    });
  }
}

describe("audit infrastructure", () => {
  it("records audit events with actor, entity and metadata", async () => {
    const database = new FakeAuditDatabaseGateway();
    const actorId = UserId.from("00000000-0000-0000-0000-000000000001");

    await new InsForgeAuditLogger(database).record({
      actorId,
      action: "project.created",
      entityType: "project",
      entityId: "00000000-0000-0000-0000-000000000010",
      occurredOnUtc: new Date("2026-05-23T10:00:00.000Z"),
      metadata: { source: "test" },
    });

    expect(database.tables.get("audit_events")).toMatchObject([
      {
        actor_id: actorId,
        action: "project.created",
        entity_type: "project",
        entity_id: "00000000-0000-0000-0000-000000000010",
        occurred_on_utc: "2026-05-23T10:00:00.000Z",
        metadata: { source: "test" },
      },
    ]);
  });

  it("retains task comments before deleting a task", async () => {
    const database = new FakeAuditDatabaseGateway();
    const actorId = UserId.from("00000000-0000-0000-0000-000000000001");
    const authorId = UserId.from("00000000-0000-0000-0000-000000000002");
    const task = SprintTask.create(
      ProjectId.from("00000000-0000-0000-0000-000000000010"),
      UserStoryId.from("00000000-0000-0000-0000-000000000020"),
      WorkItemName.create("Delete me", "tarea"),
      Description.create(""),
      new Date("2026-05-23T10:00:00.000Z"),
    );
    task.addComment(authorId, CommentBody.create("Retain this"), new Date("2026-05-23T10:05:00.000Z"));

    const unitOfWork = new InsForgeUnitOfWork(database, {
      actorId,
      utcNow: () => new Date("2026-05-23T11:00:00.000Z"),
    });
    unitOfWork.deleteSprintTask(task);
    await unitOfWork.saveChanges();

    expect(database.tables.get("retained_task_comments")).toMatchObject([
      {
        task_id: task.id,
        author_id: authorId,
        body: "Retain this",
        retained_on_utc: "2026-05-23T11:00:00.000Z",
        retained_by: actorId,
        reason: "task_deleted",
      },
    ]);
  });
});
