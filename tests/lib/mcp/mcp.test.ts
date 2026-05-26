import { describe, expect, it } from "vitest";
import { McpService, McpServiceError } from "../../../src/lib/mcp/service";
import { InsForgeAuditLogger } from "../../../src/lib/audit/audit-logger";
import { resolveProjectKey, hashProjectKey, McpAuthenticationError } from "../../../src/lib/mcp/auth";
import { parseToolArgs, McpDispatchError, MCP_TOOL_DEFINITIONS } from "../../../src/lib/mcp/tools";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { TaskStatus } from "../../../src/domain/enums/task-status";
import { UserStory } from "../../../src/domain/aggregates/user-story";
import { User } from "../../../src/domain/aggregates/user";
import { Project } from "../../../src/domain/aggregates/project";
import { ProjectMember } from "../../../src/domain/entities/project-member";
import { ProjectId } from "../../../src/domain/ids/project-id";
import { SprintTaskId } from "../../../src/domain/ids/sprint-task-id";
import { UserStoryId } from "../../../src/domain/ids/user-story-id";
import { UserId } from "../../../src/domain/ids/user-id";
import { ProjectRole } from "../../../src/domain/enums/project-role";
import { SystemRole } from "../../../src/domain/enums/system-role";
import { AccountOrigin } from "../../../src/domain/enums/account-origin";
import { ProjectName } from "../../../src/domain/value-objects/project-name";
import { WorkItemName } from "../../../src/domain/value-objects/work-item-name";
import { Description } from "../../../src/domain/value-objects/description";
import { PersonName } from "../../../src/domain/value-objects/person-name";
import { EmailAddress } from "../../../src/domain/value-objects/email-address";
import { CommentBody } from "../../../src/domain/value-objects/comment-body";
import { ExternalReference } from "../../../src/domain/value-objects/external-reference";
import { TaskComment } from "../../../src/domain/entities/task-comment";
import { TaskCommentId } from "../../../src/domain/ids/task-comment-id";

import {
  InMemorySprintTaskRepository,
  InMemoryProjectRepository,
  InMemoryUserStoryRepository,
  InMemoryTaskAgentNoteRepository,
  InMemoryAuditEventRepository,
  InMemoryUserRepository,
  FakeUnitOfWork,
  FakeClock,
} from "../../../tests/application/support/fakes";
import {
  McpGetSprintTaskDetailHandler,
  McpUpdateTaskStatusHandler,
  AddTaskAgentNoteHandler,
} from "../../../src/application/features/tasks";
import {
  GetProjectDetailHandler,
  ListProjectMembersHandler,
  ListTaskCommentsHandler,
  ListTaskAgentNotesHandler,
  GetProjectActivityHandler,
} from "../../../src/application/features/mcp-read";
import {
  McpCreateTaskCommentHandler,
  McpCreateTaskHandler,
  McpCreateUserStoryHandler,
  McpUpdateTaskDetailsHandler,
  McpAssignTaskHandler,
} from "../../../src/application/features/mcp-write";

import type { InsForgeDatabaseGateway, QueryFilter, SelectRowsOptions } from "../../../src/lib/insforge/database-gateway";

class FakeMcpDatabaseGateway implements InsForgeDatabaseGateway {
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
    const existing = this.table(table);
    for (const row of rows) {
      const rowObj = row as Record<string, unknown>;
      const idx = existing.findIndex((r) => r["id"] === rowObj["id"]);
      if (idx !== -1) {
        existing[idx] = { ...existing[idx], ...rowObj };
      } else {
        existing.push({ ...rowObj });
      }
    }
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
      if (filter.operator === "in" && Array.isArray(filter.value)) {
        return filter.value.includes(row[filter.column]);
      }
      return true;
    });
  }
}

const PROJECT_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PROJECT_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const PROJECT_KEY_ID_A = "key-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VALID_PROJECT_KEY_A = "test-project-key-a";
const STORY_A_ID = "00000000-0000-0000-0000-000000000001";
const TASK_A_ID = "00000000-0000-0000-0000-000000000010";
const TASK_B_ID = "00000000-0000-0000-0000-000000000020";
const USER_ID = "00000000-0000-0000-0000-000000000100";
const BASE_DATE = new Date("2026-05-23T10:00:00.000Z");
const FIXED_CLOCK = new FakeClock(BASE_DATE);

function setupProjectA(): {
  sprintTasks: InMemorySprintTaskRepository;
  projects: InMemoryProjectRepository;
  userStories: InMemoryUserStoryRepository;
  taskAgentNotes: InMemoryTaskAgentNoteRepository;
  uow: FakeUnitOfWork;
} {
  const sprintTasks = new InMemorySprintTaskRepository();
  const projects = new InMemoryProjectRepository();
  const userStories = new InMemoryUserStoryRepository();
  const taskAgentNotes = new InMemoryTaskAgentNoteRepository();
  const uow = new FakeUnitOfWork();

  const story = UserStory.rehydrate(
    UserStoryId.from(STORY_A_ID),
    ProjectId.from(PROJECT_A_ID),
    WorkItemName.create("Story 1", "historia"),
    Description.create(""),
    BASE_DATE,
    BASE_DATE,
  );

  const task = SprintTask.rehydrate(
    SprintTaskId.from(TASK_A_ID),
    ProjectId.from(PROJECT_A_ID),
    story.id,
    WorkItemName.create("Task A", "tarea"),
    Description.create("Task in Project A"),
    TaskStatus.NotStarted,
    BASE_DATE,
    BASE_DATE,
    [],
    [],
  );

  userStories.add(story);
  sprintTasks.add(task);

  return { sprintTasks, projects, userStories, taskAgentNotes, uow };
}

function setupProjectB(
  sprintTasks: InMemorySprintTaskRepository,
): void {
  const taskB = SprintTask.rehydrate(
    SprintTaskId.from(TASK_B_ID),
    ProjectId.from(PROJECT_B_ID),
    UserStoryId.from(STORY_A_ID),
    WorkItemName.create("Task B", "tarea"),
    Description.create("Task in Project B"),
    TaskStatus.NotStarted,
    BASE_DATE,
    BASE_DATE,
    [],
    [],
  );
  sprintTasks.add(taskB);
}

function createService(deps: {
  database: FakeMcpDatabaseGateway;
  sprintTasks: InMemorySprintTaskRepository;
  projects?: InMemoryProjectRepository;
  userStories?: InMemoryUserStoryRepository;
  taskAgentNotes: InMemoryTaskAgentNoteRepository;
  users?: InMemoryUserRepository;
  auditEvents?: InMemoryAuditEventRepository;
  uow: FakeUnitOfWork;
}): McpService {
  const { database, sprintTasks, taskAgentNotes, uow } = deps;
  const auditLogger = new InsForgeAuditLogger(database);
  const clock = new FakeClock(BASE_DATE);
  const projects = deps.projects ?? new InMemoryProjectRepository();
  const userStories = deps.userStories ?? new InMemoryUserStoryRepository();
  const users = deps.users ?? new InMemoryUserRepository();
  const auditEvents = deps.auditEvents ?? new InMemoryAuditEventRepository();

  const taskDetailHandler = new McpGetSprintTaskDetailHandler(sprintTasks);
  const updateTaskStatusHandler = new McpUpdateTaskStatusHandler(sprintTasks, uow, clock);
  const addTaskAgentNoteHandler = new AddTaskAgentNoteHandler(sprintTasks, taskAgentNotes);
  const getProjectDetailHandler = new GetProjectDetailHandler(projects, userStories, sprintTasks);
  const listProjectMembersHandler = new ListProjectMembersHandler(projects, users);
  const listTaskCommentsHandler = new ListTaskCommentsHandler(sprintTasks, users);
  const listTaskAgentNotesHandler = new ListTaskAgentNotesHandler(sprintTasks, taskAgentNotes);
  const getProjectActivityHandler = new GetProjectActivityHandler(auditEvents);
  const createTaskCommentHandler = new McpCreateTaskCommentHandler(
    sprintTasks,
    projects,
    uow,
    clock,
  );
  const createTaskHandler = new McpCreateTaskHandler(
    sprintTasks,
    userStories,
    users,
    projects,
    uow,
    clock,
  );
  const createUserStoryHandler = new McpCreateUserStoryHandler(
    userStories,
    uow,
    clock,
  );
  const updateTaskDetailsHandler = new McpUpdateTaskDetailsHandler(
    sprintTasks,
    uow,
    clock,
  );
  const assignTaskHandler = new McpAssignTaskHandler(
    sprintTasks,
    users,
    projects,
    uow,
    clock,
  );

  return new McpService(
    database,
    auditLogger,
    PROJECT_KEY_ID_A,
    taskDetailHandler,
    updateTaskStatusHandler,
    addTaskAgentNoteHandler,
    getProjectDetailHandler,
    listProjectMembersHandler,
    listTaskCommentsHandler,
    listTaskAgentNotesHandler,
    getProjectActivityHandler,
    createTaskCommentHandler,
    createTaskHandler,
    createUserStoryHandler,
    updateTaskDetailsHandler,
    assignTaskHandler,
  );
}

describe("MCP", () => {
  describe("tools/list", () => {
    it("should expose definitions for all 12 tools", () => {
      const names = MCP_TOOL_DEFINITIONS.map((t) => t.name);
      expect(names).toEqual([
        "get_project_backlog",
        "get_user_story_by_id",
        "get_task_by_id",
        "search_tasks",
        "update_task_status",
        "add_task_agent_note",
        "get_sprintroom_mcp_skill",
        "get_project_detail",
        "list_project_members",
        "list_task_comments",
        "list_task_agent_notes",
        "get_project_activity",
        "create_task_comment",
        "create_task",
        "create_user_story",
        "update_task_details",
        "assign_task",
      ]);
    });
  });

  describe("PROJECT_KEY validation", () => {
    it("should reject empty PROJECT_KEY", async () => {
      const database = new FakeMcpDatabaseGateway();
      await expect(resolveProjectKey(database, "")).rejects.toThrow(McpAuthenticationError);
    });

    it("should reject invalid PROJECT_KEY", async () => {
      const database = new FakeMcpDatabaseGateway();
      await expect(resolveProjectKey(database, "nonexistent-key")).rejects.toThrow(McpAuthenticationError);
    });

    it("should accept valid PROJECT_KEY", async () => {
      const database = new FakeMcpDatabaseGateway();
      database.tables.set("project_keys", [
        {
          id: PROJECT_KEY_ID_A,
          project_id: PROJECT_A_ID,
          key_hash: hashProjectKey(VALID_PROJECT_KEY_A),
          description: "Key for Project A",
          is_active: true,
          created_on_utc: "2026-05-23T00:00:00.000Z",
        },
      ]);
      const result = await resolveProjectKey(database, VALID_PROJECT_KEY_A);
      expect(result.projectId).toBe(PROJECT_A_ID);
      expect(result.keyId).toBe(PROJECT_KEY_ID_A);
    });
  });

  describe("update_task_status", () => {
    it("should update status and record audit event through application handler", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      const result = await service.updateTaskStatus(PROJECT_A_ID, {
        tool: "update_task_status",
        taskId: TASK_A_ID,
        status: "in_progress",
      });

      expect(result.taskId).toBe(TASK_A_ID);
      expect(result.previousStatus).toBe("not_started");
      expect(result.newStatus).toBe("in_progress");

      const updated = await sprintTasks.getById(SprintTaskId.from(TASK_A_ID));
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("in_progress");

      const auditEvents = database.tables.get("audit_events") ?? [];
      expect(auditEvents.length).toBe(1);
      expect(auditEvents[0]["action"]).toBe("mcp.update_task_status");
      expect(auditEvents[0]["entity_type"]).toBe("sprint_task");
      expect(auditEvents[0]["entity_id"]).toBe(TASK_A_ID);
      const meta = auditEvents[0]["metadata"] as Record<string, unknown>;
      expect(meta["projectKeyId"]).toBe(PROJECT_KEY_ID_A);
      expect(meta["projectId"]).toBe(PROJECT_A_ID);
      expect(meta["tool"]).toBe("update_task_status");
      expect(meta["result"]).toBe("success");
    });

    it("should set is_completed when status is completed", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      await service.updateTaskStatus(PROJECT_A_ID, {
        tool: "update_task_status",
        taskId: TASK_A_ID,
        status: "completed",
      });

      const updated = await sprintTasks.getById(SprintTaskId.from(TASK_A_ID));
      expect(updated!.isCompleted).toBe(true);
    });

    it("should reject invalid status value", () => {
      expect(() =>
        parseToolArgs({ tool: "update_task_status", taskId: TASK_A_ID, status: "invalid_status" }),
      ).toThrow(McpDispatchError);
    });

    it("should reject missing taskId", () => {
      expect(() =>
        parseToolArgs({ tool: "update_task_status", status: "in_progress" }),
      ).toThrow(McpDispatchError);
    });

    it("should isolate by projectId", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      setupProjectB(sprintTasks);
      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      await expect(
        service.updateTaskStatus(PROJECT_A_ID, {
          tool: "update_task_status",
          taskId: TASK_B_ID,
          status: "completed",
        }),
      ).rejects.toThrow(McpServiceError);

      const auditEvents = database.tables.get("audit_events") ?? [];
      const statusEvents = auditEvents.filter((e) => e["action"] === "mcp.update_task_status");
      expect(statusEvents.length).toBe(1);
      const meta = statusEvents[0]["metadata"] as Record<string, unknown>;
      expect(meta["result"]).toBe("error");
    });

    it("should record audit on not-found error", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      await expect(
        service.updateTaskStatus(PROJECT_A_ID, {
          tool: "update_task_status",
          taskId: "00000000-0000-0000-0000-000000009999",
          status: "completed",
        }),
      ).rejects.toThrow(McpServiceError);

      const auditEvents = database.tables.get("audit_events") ?? [];
      const errorEvent = auditEvents.find((e) => e["action"] === "mcp.update_task_status");
      expect(errorEvent).toBeTruthy();
      const meta = errorEvent!["metadata"] as Record<string, unknown>;
      expect(meta["result"]).toBe("error");
    });

    it("should no longer write directly to DB from McpService", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      await service.updateTaskStatus(PROJECT_A_ID, {
        tool: "update_task_status",
        taskId: TASK_A_ID,
        status: "in_progress",
      });

      const sprintTasksTable = database.tables.get("sprint_tasks") ?? [];
      expect(sprintTasksTable.length).toBe(0);
    });
  });

  describe("add_task_agent_note", () => {
    it("should add note and record audit event through application handler", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      const result = await service.addTaskAgentNote(PROJECT_A_ID, {
        tool: "add_task_agent_note",
        taskId: TASK_A_ID,
        content: "This is a test agent note.",
      });

      expect(result.taskId).toBe(TASK_A_ID);
      expect(result.content).toBe("This is a test agent note.");
      expect(result.noteId).toBeTruthy();

      expect(taskAgentNotes.notes.length).toBe(1);
      expect(taskAgentNotes.notes[0].taskId).toBe(TASK_A_ID);

      const auditEvents = database.tables.get("audit_events") ?? [];
      const noteEvents = auditEvents.filter((e) => e["action"] === "mcp.add_task_agent_note");
      expect(noteEvents.length).toBe(1);
      const meta = noteEvents[0]["metadata"] as Record<string, unknown>;
      expect(meta["projectKeyId"]).toBe(PROJECT_KEY_ID_A);
      expect(meta["projectId"]).toBe(PROJECT_A_ID);
      expect(meta["tool"]).toBe("add_task_agent_note");
      expect(meta["result"]).toBe("success");
    });

    it("should reject missing content", () => {
      expect(() =>
        parseToolArgs({ tool: "add_task_agent_note", taskId: TASK_A_ID, content: "" }),
      ).toThrow(McpDispatchError);
    });

    it("should record audit on error when task not found", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      await expect(
        service.addTaskAgentNote(PROJECT_A_ID, {
          tool: "add_task_agent_note",
          taskId: "00000000-0000-0000-0000-000000009999",
          content: "This note will fail.",
        }),
      ).rejects.toThrow(McpServiceError);

      const auditEvents = database.tables.get("audit_events") ?? [];
      const errorEvent = auditEvents.find((e) => e["action"] === "mcp.add_task_agent_note");
      expect(errorEvent).toBeTruthy();
      const meta = errorEvent!["metadata"] as Record<string, unknown>;
      expect(meta["result"]).toBe("error");
    });
  });

  describe("get_task_by_id", () => {
    it("should return task detail through application handler", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, projects, userStories, taskAgentNotes, uow } = setupProjectA();
      database.tables.set("user_stories", [
        { id: STORY_A_ID, project_id: PROJECT_A_ID, title: "Story 1", description: "", created_on_utc: "", updated_on_utc: "" },
      ]);
      database.tables.set("projects", [
        { id: PROJECT_A_ID, name: "Project A", description: "", external_reference: "", owner_id: USER_ID, created_on_utc: "", updated_on_utc: "" },
      ]);

      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      const result = await service.getTaskById(PROJECT_A_ID, {
        tool: "get_task_by_id",
        taskId: TASK_A_ID,
      });

      expect(result.task.id).toBe(TASK_A_ID);
      expect(result.task.title).toBe("Task A");
      expect(result.task.status).toBe("not_started");
      expect(result.userStory.title).toBe("Story 1");
      expect(result.project.name).toBe("Project A");
    });

    it("should respect isolation by projectId", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      setupProjectB(sprintTasks);
      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      await expect(
        service.getTaskById(PROJECT_A_ID, {
          tool: "get_task_by_id",
          taskId: TASK_B_ID,
        }),
      ).rejects.toThrow(McpServiceError);
    });
  });

  describe("get_project_detail", () => {
    it("should return project detail with counts", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, userStories, taskAgentNotes, uow } = setupProjectA();
      const projects = new InMemoryProjectRepository();
      const project = Project.rehydrate(
        ProjectId.from(PROJECT_A_ID),
    ProjectName.create("Project A"),
        Description.create("Test project"),
        ExternalReference.create(""),
        UserId.from(USER_ID),
        BASE_DATE,
        BASE_DATE,
        [],
      );
      projects.add(project);
    });

    it("should reject non-existent project", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, userStories, taskAgentNotes, uow } = setupProjectA();
      const projects = new InMemoryProjectRepository();
      const service = createService({ database, sprintTasks, userStories, taskAgentNotes, uow, projects });

      await expect(
        service.getProjectDetail(PROJECT_A_ID, { tool: "get_project_detail" }),
      ).rejects.toThrow(McpServiceError);
    });
  });

  describe("list_project_members", () => {
    it("should list members with user info", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      const projects = new InMemoryProjectRepository();
      const users = new InMemoryUserRepository();
      const userA = User.rehydrate(
        UserId.from(USER_ID),
        PersonName.create("Alice"),
        EmailAddress.create("alice@test.com"),
        "hash",
        SystemRole.Member,
        AccountOrigin.PublicRegistration,
        BASE_DATE,
        BASE_DATE,
      );
      users.add(userA);
      const project = Project.rehydrate(
        ProjectId.from(PROJECT_A_ID),
        ProjectName.create("Project A"),
        Description.create(""),
        ExternalReference.create(""),
        UserId.from(USER_ID),
        BASE_DATE,
        new Date("2026-05-24T00:00:00.000Z"),
        [new ProjectMember(UserId.from(USER_ID), ProjectRole.Owner, new Date("2026-05-23T00:00:00.000Z"))],
      );
      projects.add(project);

      const service = createService({ database, sprintTasks, taskAgentNotes, uow, projects, users });

      const result = await service.listProjectMembers(PROJECT_A_ID, { tool: "list_project_members" });

      expect(result.members.length).toBe(1);
      expect(result.members[0].userId).toBe(USER_ID);
      expect(result.members[0].fullName).toBe("Alice");
      expect(result.members[0].email).toBe("alice@test.com");
      expect(result.members[0].role).toBe("Owner");
    });
  });

  describe("list_task_comments", () => {
    it("should list comments for a task", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      const users = new InMemoryUserRepository();
      const userA = User.rehydrate(
        UserId.from(USER_ID),
        PersonName.create("Alice"),
        EmailAddress.create("alice@test.com"),
        "hash",
        SystemRole.Member,
        AccountOrigin.PublicRegistration,
        BASE_DATE,
        BASE_DATE,
      );
      users.add(userA);
      const task = await sprintTasks.getById(SprintTaskId.from(TASK_A_ID));
      if (task !== null) {
        task.addComment(UserId.from(USER_ID), CommentBody.create("Test comment"), BASE_DATE);
      }

      const service = createService({ database, sprintTasks, taskAgentNotes, uow, users });

      const result = await service.listTaskComments(PROJECT_A_ID, {
        tool: "list_task_comments",
        taskId: TASK_A_ID,
      });

      expect(result.comments.length).toBe(1);
      expect(result.comments[0].authorId).toBe(USER_ID);
      expect(result.comments[0].authorName).toBe("Alice");
      expect(result.comments[0].body).toBe("Test comment");
    });

    it("should reject task from another project", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      setupProjectB(sprintTasks);
      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      await expect(
        service.listTaskComments(PROJECT_A_ID, {
          tool: "list_task_comments",
          taskId: TASK_B_ID,
        }),
      ).rejects.toThrow(McpServiceError);
    });
  });

  describe("list_task_agent_notes", () => {
    it("should list agent notes for a task", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();

      await taskAgentNotes.add({
        id: "note-1",
        projectId: PROJECT_A_ID,
        taskId: TASK_A_ID,
        content: "Agent note content",
        createdOnUtc: "2026-05-23T10:00:00.000Z",
      });

      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      const result = await service.listTaskAgentNotes(PROJECT_A_ID, {
        tool: "list_task_agent_notes",
        taskId: TASK_A_ID,
      });

      expect(result.notes.length).toBe(1);
      expect(result.notes[0].content).toBe("Agent note content");
      expect(result.notes[0].taskId).toBe(TASK_A_ID);
    });

    it("should reject task from another project", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      setupProjectB(sprintTasks);
      const service = createService({ database, sprintTasks, taskAgentNotes, uow });

      await expect(
        service.listTaskAgentNotes(PROJECT_A_ID, {
          tool: "list_task_agent_notes",
          taskId: TASK_B_ID,
        }),
      ).rejects.toThrow(McpServiceError);
    });
  });

  describe("get_project_activity", () => {
    it("should return recent activity events", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      const auditEvents = new InMemoryAuditEventRepository();
      auditEvents.events.push(
        { id: "evt-1", action: "mcp.update_task_status", entityType: "sprint_task", entityId: TASK_A_ID, occurredOnUtc: "2026-05-23T11:00:00.000Z" },
        { id: "evt-2", action: "task.created", entityType: "sprint_task", entityId: TASK_A_ID, occurredOnUtc: "2026-05-23T10:30:00.000Z" },
      );

      const service = createService({ database, sprintTasks, taskAgentNotes, uow, auditEvents });

      const result = await service.getProjectActivity(PROJECT_A_ID, {
        tool: "get_project_activity",
        limit: 10,
      });

      expect(result.events.length).toBe(2);
      expect(result.events.map(e => e.action)).toContain("mcp.update_task_status");
      expect(result.events.map(e => e.action)).toContain("task.created");
    });

    it("should respect limit parameter", async () => {
      const database = new FakeMcpDatabaseGateway();
      const { sprintTasks, taskAgentNotes, uow } = setupProjectA();
      const auditEvents = new InMemoryAuditEventRepository();
      auditEvents.events.push(
        { id: "evt-1", action: "event-1", entityType: "test", entityId: "1", occurredOnUtc: "2026-05-23T11:00:00.000Z" },
        { id: "evt-2", action: "event-2", entityType: "test", entityId: "2", occurredOnUtc: "2026-05-23T10:30:00.000Z" },
        { id: "evt-3", action: "event-3", entityType: "test", entityId: "3", occurredOnUtc: "2026-05-23T10:00:00.000Z" },
      );

      const service = createService({ database, sprintTasks, taskAgentNotes, uow, auditEvents });

      const result = await service.getProjectActivity(PROJECT_A_ID, {
        tool: "get_project_activity",
        limit: 2,
      });

      expect(result.events.length).toBe(2);
    });

    it("should reject excessive limit", () => {
      expect(() =>
        parseToolArgs({ tool: "get_project_activity", limit: 100 }),
      ).toThrow(McpDispatchError);
    });
  });
});
