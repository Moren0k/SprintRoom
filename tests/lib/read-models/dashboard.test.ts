import { describe, expect, it } from "vitest";
import { SystemRole } from "../../../src/domain/enums/system-role";
import { UserId } from "../../../src/domain/ids/user-id";
import type {
  InsForgeDatabaseGateway,
  QueryFilter,
  SelectRowsOptions,
} from "../../../src/lib/insforge/database-gateway";
import { InsForgeDashboardReadModel } from "../../../src/lib/read-models/dashboard";

class FakeReadDatabaseGateway implements InsForgeDatabaseGateway {
  readonly selectCalls: string[] = [];

  constructor(private readonly tables: Record<string, Record<string, unknown>[]>) {}

  async selectRows<T>(table: string, options: SelectRowsOptions = {}): Promise<T[]> {
    this.selectCalls.push(table);
    let rows = [...(this.tables[table] ?? [])].filter((row) =>
      this.matches(row, options.filters ?? []),
    );
    if (options.orderBy !== undefined) {
      const direction = options.orderBy.ascending === false ? -1 : 1;
      rows = rows.toSorted((left, right) =>
        String(left[options.orderBy!.column]).localeCompare(String(right[options.orderBy!.column])) * direction,
      );
    }
    return rows.map((row) => ({ ...row })) as T[];
  }

  async selectOne<T>(table: string, filters: ReadonlyArray<QueryFilter>): Promise<T | null> {
    return (await this.selectRows<T>(table, { filters }))[0] ?? null;
  }

  async insertRows(): Promise<void> {}

  async upsertRows(): Promise<void> {}

  async deleteRows(): Promise<void> {}

  private matches(row: Record<string, unknown>, filters: ReadonlyArray<QueryFilter>): boolean {
    return filters.every((filter) => {
      if (filter.operator === "eq") {
        return row[filter.column] === filter.value;
      }
      return filter.value.includes(row[filter.column]);
    });
  }
}

function createDatabase(): FakeReadDatabaseGateway {
  return new FakeReadDatabaseGateway({
    users: [
      {
        id: "u1",
        full_name: "Owner User",
        email: "owner@sprintroom.dev",
        password_hash: "hash",
        system_role: 1,
        account_origin: 1,
        created_on_utc: "2026-05-23T10:00:00.000Z",
        updated_on_utc: "2026-05-23T10:00:00.000Z",
      },
      {
        id: "u2",
        full_name: "Member User",
        email: "member@sprintroom.dev",
        password_hash: "hash",
        system_role: 1,
        account_origin: 1,
        created_on_utc: "2026-05-23T10:00:00.000Z",
        updated_on_utc: "2026-05-23T10:00:00.000Z",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Visible Project",
        description: "Visible",
        external_reference: "",
        owner_id: "u1",
        created_on_utc: "2026-05-23T10:00:00.000Z",
        updated_on_utc: "2026-05-23T10:00:00.000Z",
      },
      {
        id: "p2",
        name: "Hidden Project",
        description: "Hidden",
        external_reference: "",
        owner_id: "u2",
        created_on_utc: "2026-05-23T09:00:00.000Z",
        updated_on_utc: "2026-05-23T09:00:00.000Z",
      },
    ],
    project_members: [
      { project_id: "p1", user_id: "u1", role: 4, joined_on_utc: "2026-05-23T10:00:00.000Z" },
      { project_id: "p1", user_id: "u2", role: 2, joined_on_utc: "2026-05-23T10:00:00.000Z" },
      { project_id: "p2", user_id: "u2", role: 4, joined_on_utc: "2026-05-23T09:00:00.000Z" },
    ],
    user_stories: [
      { id: "s1", project_id: "p1", title: "Story 1", description: "", created_on_utc: "2026-05-23T10:00:00.000Z", updated_on_utc: "2026-05-23T10:00:00.000Z" },
      { id: "s2", project_id: "p1", title: "Story 2", description: "", created_on_utc: "2026-05-23T10:00:00.000Z", updated_on_utc: "2026-05-23T10:00:00.000Z" },
      { id: "s3", project_id: "p2", title: "Story 3", description: "", created_on_utc: "2026-05-23T09:00:00.000Z", updated_on_utc: "2026-05-23T09:00:00.000Z" },
    ],
    sprint_tasks: [
      { id: "t1", project_id: "p1", user_story_id: "s1", title: "Done", description: "", is_completed: true, status: "completed", created_on_utc: "2026-05-23T10:00:00.000Z", updated_on_utc: "2026-05-23T10:00:00.000Z" },
      { id: "t2", project_id: "p1", user_story_id: "s1", title: "Mine", description: "", is_completed: false, status: "in_progress", created_on_utc: "2026-05-23T10:00:00.000Z", updated_on_utc: "2026-05-23T10:00:00.000Z" },
      { id: "t3", project_id: "p1", user_story_id: "s2", title: "Backlog", description: "", is_completed: false, status: "not_started", created_on_utc: "2026-05-23T10:00:00.000Z", updated_on_utc: "2026-05-23T10:00:00.000Z" },
      { id: "t4", project_id: "p2", user_story_id: "s3", title: "Hidden", description: "", is_completed: false, status: "not_started", created_on_utc: "2026-05-23T09:00:00.000Z", updated_on_utc: "2026-05-23T09:00:00.000Z" },
    ],
    sprint_task_assignments: [
      { task_id: "t1", user_id: "u2" },
      { task_id: "t2", user_id: "u1" },
      { task_id: "t4", user_id: "u1" },
    ],
    task_comments: [{ id: "c1", task_id: "t2", author_id: "u1", body: "Ping", created_on_utc: "2026-05-23T10:00:00.000Z" }],
  });
}

describe("InsForgeDashboardReadModel", () => {
  it("builds dashboard data with batched visible project queries", async () => {
    const database = createDatabase();
    const readModel = new InsForgeDashboardReadModel(database);

    const dashboard = await readModel.getDashboard({
      userId: UserId.from("u1"),
      systemRole: SystemRole.Member,
    });

    expect(dashboard.totals).toEqual({
      visibleProjectCount: 1,
      ownedProjectCount: 1,
      personalTaskCount: 1,
      completedPersonalTaskCount: 0,
    });
    expect(dashboard.projects[0]).toMatchObject({
      projectId: "p1",
      currentUserProjectRole: "Owner",
      memberCount: 2,
      userStoryCount: 2,
      taskCount: 3,
      progress: (100 + 40 + 0) / 3,
    });
    expect(dashboard.personalTasks).toMatchObject([
      { sprintTaskId: "t2", projectName: "Visible Project", commentCount: 1 },
    ]);
    expect(database.selectCalls.length).toBeLessThanOrEqual(7);
  });

  it("returns member detail limited to the requested project", async () => {
    const readModel = new InsForgeDashboardReadModel(createDatabase());

    const detail = await readModel.getProjectMemberDetail(
      { userId: UserId.from("u1"), systemRole: SystemRole.Member },
      "p1",
      "u2",
    );

    expect(detail).toMatchObject({
      userId: "u2",
      fullName: "Member User",
      projectRole: "Contributor",
      totalAssignedTasks: 1,
      completedAssignedTasks: 1,
      pendingAssignedTasks: 0,
      assignedTasksCompletionRate: 100,
    });
    expect(detail.assignedTasks).toHaveLength(1);
    expect(detail.assignedTasks[0].projectId).toBe("p1");
  });
});
