import { describe, expect, it } from "vitest";
import { Project } from "../../../src/domain/aggregates/project";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { User } from "../../../src/domain/aggregates/user";
import { UserStory } from "../../../src/domain/aggregates/user-story";
import { AccountOrigin } from "../../../src/domain/enums/account-origin";
import { ProjectRole } from "../../../src/domain/enums/project-role";
import { SystemRole } from "../../../src/domain/enums/system-role";
import { UserId } from "../../../src/domain/ids/user-id";
import { CommentBody } from "../../../src/domain/value-objects/comment-body";
import { Description } from "../../../src/domain/value-objects/description";
import { EmailAddress } from "../../../src/domain/value-objects/email-address";
import { ExternalReference } from "../../../src/domain/value-objects/external-reference";
import { PersonName } from "../../../src/domain/value-objects/person-name";
import { ProjectName } from "../../../src/domain/value-objects/project-name";
import { WorkItemName } from "../../../src/domain/value-objects/work-item-name";
import type {
  InsForgeDatabaseGateway,
  QueryFilter,
  SelectRowsOptions,
  WriteRowsOptions,
} from "../../../src/lib/insforge/database-gateway";
import { createInsForgeRepositoryScope } from "../../../src/lib/insforge/repositories";

class FakeInsForgeDatabaseGateway implements InsForgeDatabaseGateway {
  readonly tables = new Map<string, Record<string, unknown>[]>();
  readonly operations: string[] = [];

  async selectRows<T>(table: string, options: SelectRowsOptions = {}): Promise<T[]> {
    this.operations.push(`select:${table}`);
    let rows = this.table(table).filter((row) => this.matches(row, options.filters ?? []));
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

  async insertRows<T extends object>(table: string, rows: ReadonlyArray<T>): Promise<void> {
    this.operations.push(`insert:${table}`);
    this.table(table).push(
      ...rows.map((row) => ({ ...(row as Record<string, unknown>) })),
    );
  }

  async upsertRows<T extends object>(
    table: string,
    rows: ReadonlyArray<T>,
    options: WriteRowsOptions = {},
  ): Promise<void> {
    this.operations.push(`upsert:${table}`);
    const keys = options.onConflict?.split(",").map((key) => key.trim()) ?? ["id"];
    const tableRows = this.table(table);
    for (const row of rows.map((item) => ({ ...item }) as Record<string, unknown>)) {
      const index = tableRows.findIndex((current) =>
        keys.every((key) => current[key] === row[key]),
      );
      if (index === -1) {
        tableRows.push(row);
      } else {
        tableRows[index] = row;
      }
    }
  }

  async deleteRows(table: string, filters: ReadonlyArray<QueryFilter>): Promise<void> {
    this.operations.push(`delete:${table}`);
    const remaining = this.table(table).filter((row) => !this.matches(row, filters));
    this.tables.set(table, remaining);
  }

  private table(name: string): Record<string, unknown>[] {
    const rows = this.tables.get(name) ?? [];
    this.tables.set(name, rows);
    return rows;
  }

  private matches(row: Record<string, unknown>, filters: ReadonlyArray<QueryFilter>): boolean {
    return filters.every((filter) => {
      if (filter.operator === "eq") {
        return row[filter.column] === filter.value;
      }
      return filter.value.includes(row[filter.column]);
    });
  }
}

describe("InsForge repositories", () => {
  it("persists tracked aggregate changes through the unit of work", async () => {
    const database = new FakeInsForgeDatabaseGateway();
    const createdOnUtc = new Date("2026-05-23T10:00:00.000Z");
    const updatedOnUtc = new Date("2026-05-23T11:00:00.000Z");
    const owner = User.rehydrate(
      UserId.from("00000000-0000-0000-0000-000000000001"),
      PersonName.create("Owner User"),
      EmailAddress.create("owner@sprintroom.dev"),
      "hash::owner",
      SystemRole.Member,
      AccountOrigin.PublicRegistration,
      createdOnUtc,
      createdOnUtc,
    );
    const member = User.rehydrate(
      UserId.from("00000000-0000-0000-0000-000000000002"),
      PersonName.create("Member User"),
      EmailAddress.create("member@sprintroom.dev"),
      "hash::member",
      SystemRole.Member,
      AccountOrigin.AdministrativeProvisioning,
      createdOnUtc,
      createdOnUtc,
    );

    const writeScope = createInsForgeRepositoryScope(database);
    await writeScope.users.add(owner);
    await writeScope.users.add(member);

    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Core project"),
      ExternalReference.create("https://example.com/sprintroom"),
      owner.id,
      createdOnUtc,
    );
    project.addMember(member.id, ProjectRole.Contributor, createdOnUtc);
    await writeScope.projects.add(project);

    const userStory = UserStory.create(
      project.id,
      WorkItemName.create("User registration", "historia de usuario"),
      Description.create("Register public users"),
      createdOnUtc,
    );
    await writeScope.userStories.add(userStory);

    const sprintTask = SprintTask.create(
      project.id,
      userStory.id,
      WorkItemName.create("Build API", "tarea"),
      Description.create("Expose registration endpoint"),
      createdOnUtc,
    );
    sprintTask.assignUser(member.id, createdOnUtc);
    await writeScope.sprintTasks.add(sprintTask);
    await writeScope.unitOfWork.saveChanges();

    const readScope = createInsForgeRepositoryScope(database);
    const loadedUser = await readScope.users.getByEmail("owner@sprintroom.dev");
    expect(loadedUser).not.toBeNull();
    loadedUser!.updateProfile(
      PersonName.create("Updated Owner"),
      EmailAddress.create("owner@sprintroom.dev"),
      updatedOnUtc,
    );

    const loadedTask = await readScope.sprintTasks.getById(sprintTask.id);
    expect(loadedTask).not.toBeNull();
    loadedTask!.addComment(owner.id, CommentBody.create("Ready for review"), updatedOnUtc);
    await readScope.unitOfWork.saveChanges();

    expect(database.tables.get("users")?.[0]).toMatchObject({
      full_name: "Updated Owner",
      system_role: 1,
      account_origin: 1,
    });
    expect(database.tables.get("projects")).toHaveLength(1);
    expect(database.tables.get("project_members")).toHaveLength(2);
    expect(database.tables.get("sprint_task_assignments")).toEqual([
      { task_id: sprintTask.id, user_id: member.id },
    ]);
    expect(database.tables.get("task_comments")).toMatchObject([
      {
        task_id: sprintTask.id,
        author_id: owner.id,
        body: "Ready for review",
      },
    ]);
  });

  it("does not persist aggregates that were only loaded for reads", async () => {
    const database = new FakeInsForgeDatabaseGateway();
    const createdOnUtc = new Date("2026-05-23T10:00:00.000Z");
    const owner = User.rehydrate(
      UserId.from("00000000-0000-0000-0000-000000000001"),
      PersonName.create("Owner User"),
      EmailAddress.create("owner@sprintroom.dev"),
      "hash::owner",
      SystemRole.Member,
      AccountOrigin.PublicRegistration,
      createdOnUtc,
      createdOnUtc,
    );
    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Core project"),
      ExternalReference.create(""),
      owner.id,
      createdOnUtc,
    );
    const seedScope = createInsForgeRepositoryScope(database);
    await seedScope.users.add(owner);
    await seedScope.projects.add(project);
    await seedScope.unitOfWork.saveChanges();

    database.operations.length = 0;
    const scope = createInsForgeRepositoryScope(database);
    const loadedProject = await scope.projects.getById(project.id);
    expect(loadedProject).not.toBeNull();

    const userStory = UserStory.create(
      project.id,
      WorkItemName.create("Story", "historia de usuario"),
      Description.create(""),
      createdOnUtc,
    );
    await scope.userStories.add(userStory);
    await scope.unitOfWork.saveChanges();

    expect(database.operations).toContain("upsert:user_stories");
    expect(database.operations).not.toContain("upsert:projects");
    expect(database.operations).not.toContain("delete:project_members");
  });
});
