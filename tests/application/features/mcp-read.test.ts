import { describe, expect, it } from "vitest";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { User } from "../../../src/domain/aggregates/user";
import { UserStory } from "../../../src/domain/aggregates/user-story";
import { Project } from "../../../src/domain/aggregates/project";
import { ProjectMember } from "../../../src/domain/entities/project-member";
import { TaskComment } from "../../../src/domain/entities/task-comment";
import { TaskStatus } from "../../../src/domain/enums/task-status";
import { ProjectRole } from "../../../src/domain/enums/project-role";
import { SystemRole } from "../../../src/domain/enums/system-role";
import { AccountOrigin } from "../../../src/domain/enums/account-origin";
import { ProjectId } from "../../../src/domain/ids/project-id";
import { SprintTaskId } from "../../../src/domain/ids/sprint-task-id";
import { UserStoryId } from "../../../src/domain/ids/user-story-id";
import { UserId } from "../../../src/domain/ids/user-id";
import { TaskCommentId } from "../../../src/domain/ids/task-comment-id";
import { ProjectName } from "../../../src/domain/value-objects/project-name";
import { WorkItemName } from "../../../src/domain/value-objects/work-item-name";
import { Description } from "../../../src/domain/value-objects/description";
import { PersonName } from "../../../src/domain/value-objects/person-name";
import { EmailAddress } from "../../../src/domain/value-objects/email-address";
import { CommentBody } from "../../../src/domain/value-objects/comment-body";
import { ExternalReference } from "../../../src/domain/value-objects/external-reference";
import { ApplicationError } from "../../../src/application/abstractions/application-error";
import {
  GetProjectDetailHandler,
  ListProjectMembersHandler,
  ListTaskCommentsHandler,
  ListTaskAgentNotesHandler,
  GetProjectActivityHandler,
} from "../../../src/application/features/mcp-read";
import {
  InMemoryProjectRepository,
  InMemoryUserStoryRepository,
  InMemorySprintTaskRepository,
  InMemoryTaskAgentNoteRepository,
  InMemoryAuditEventRepository,
  InMemoryUserRepository,
} from "../support/fakes";

const PROJECT_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PROJECT_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const STORY_A_ID = "00000000-0000-0000-0000-000000000001";
const TASK_A_ID = "00000000-0000-0000-0000-000000000010";
const TASK_B_ID = "00000000-0000-0000-0000-000000000020";
const USER_A_ID = "00000000-0000-0000-0000-000000000100";
const USER_B_ID = "00000000-0000-0000-0000-000000000101";
const BASE_DATE = new Date("2026-05-23T10:00:00.000Z");

function setupProjectWithData(): {
  projects: InMemoryProjectRepository;
  userStories: InMemoryUserStoryRepository;
  sprintTasks: InMemorySprintTaskRepository;
  taskAgentNotes: InMemoryTaskAgentNoteRepository;
  users: InMemoryUserRepository;
  auditEvents: InMemoryAuditEventRepository;
} {
  const projects = new InMemoryProjectRepository();
  const userStories = new InMemoryUserStoryRepository();
  const sprintTasks = new InMemorySprintTaskRepository();
  const taskAgentNotes = new InMemoryTaskAgentNoteRepository();
  const users = new InMemoryUserRepository();
  const auditEvents = new InMemoryAuditEventRepository();

  const userA = User.rehydrate(
    UserId.from(USER_A_ID),
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
    Description.create("Test project"),
    ExternalReference.create(""),
    UserId.from(USER_A_ID),
    BASE_DATE,
    BASE_DATE,
    [new ProjectMember(UserId.from(USER_A_ID), ProjectRole.Owner, BASE_DATE)],
  );
  projects.add(project);

  const story = UserStory.rehydrate(
    UserStoryId.from(STORY_A_ID),
    ProjectId.from(PROJECT_A_ID),
    WorkItemName.create("Story 1", "historia"),
    Description.create(""),
    BASE_DATE,
    BASE_DATE,
  );
  userStories.add(story);

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
    [
      new TaskComment(
        TaskCommentId.from("comment-1"),
        UserId.from(USER_A_ID),
        CommentBody.create("Test comment"),
        BASE_DATE,
      ),
    ],
  );
  sprintTasks.add(task);

  taskAgentNotes.add({
    id: "note-1",
    projectId: PROJECT_A_ID,
    taskId: TASK_A_ID,
    content: "Agent note for Task A",
    createdOnUtc: "2026-05-23T10:00:00.000Z",
  });

  return { projects, userStories, sprintTasks, taskAgentNotes, users, auditEvents };
}

function addCrossProjectTask(
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

describe("MCP Read Handlers", () => {
  describe("GetProjectDetailHandler", () => {
    it("should return project detail with correct counts", async () => {
      const { projects, userStories, sprintTasks } = setupProjectWithData();
      const handler = new GetProjectDetailHandler(projects, userStories, sprintTasks);

      const result = await handler.handle({ projectId: PROJECT_A_ID });

      expect(result.id).toBe(PROJECT_A_ID);
      expect(result.name).toBe("Project A");
      expect(result.counts.userStories).toBe(1);
      expect(result.counts.tasks).toBe(1);
      expect(result.counts.members).toBe(1);
      expect(result.counts.completedTasks).toBe(0);
    });

    it("should throw for non-existent project", async () => {
      const { projects, userStories, sprintTasks } = setupProjectWithData();
      const handler = new GetProjectDetailHandler(projects, userStories, sprintTasks);

      await expect(
        handler.handle({ projectId: PROJECT_B_ID }),
      ).rejects.toThrow(ApplicationError);
    });
  });

  describe("ListProjectMembersHandler", () => {
    it("should return members with user details", async () => {
      const { projects, users } = setupProjectWithData();
      const handler = new ListProjectMembersHandler(projects, users);

      const result = await handler.handle({ projectId: PROJECT_A_ID });

      expect(result.length).toBe(1);
      expect(result[0].userId).toBe(USER_A_ID);
      expect(result[0].fullName).toBe("Alice");
      expect(result[0].email).toBe("alice@test.com");
      expect(result[0].role).toBe("Owner");
    });

    it("should throw for non-existent project", async () => {
      const { projects, users } = setupProjectWithData();
      const handler = new ListProjectMembersHandler(projects, users);

      await expect(
        handler.handle({ projectId: PROJECT_B_ID }),
      ).rejects.toThrow(ApplicationError);
    });
  });

  describe("ListTaskCommentsHandler", () => {
    it("should return comments for a project task", async () => {
      const { sprintTasks, users } = setupProjectWithData();
      const handler = new ListTaskCommentsHandler(sprintTasks, users);

      const result = await handler.handle({ projectId: PROJECT_A_ID, taskId: TASK_A_ID });

      expect(result.length).toBe(1);
      expect(result[0].authorId).toBe(USER_A_ID);
      expect(result[0].authorName).toBe("Alice");
      expect(result[0].body).toBe("Test comment");
    });

    it("should reject task from other project", async () => {
      const { sprintTasks, users } = setupProjectWithData();
      addCrossProjectTask(sprintTasks);
      const handler = new ListTaskCommentsHandler(sprintTasks, users);

      await expect(
        handler.handle({ projectId: PROJECT_A_ID, taskId: TASK_B_ID }),
      ).rejects.toThrow(ApplicationError);
    });

    it("should throw for non-existent task", async () => {
      const { sprintTasks, users } = setupProjectWithData();
      const handler = new ListTaskCommentsHandler(sprintTasks, users);

      await expect(
        handler.handle({ projectId: PROJECT_A_ID, taskId: "00000000-0000-0000-0000-000000009999" }),
      ).rejects.toThrow(ApplicationError);
    });
  });

  describe("ListTaskAgentNotesHandler", () => {
    it("should return agent notes for a project task", async () => {
      const { sprintTasks, taskAgentNotes } = setupProjectWithData();
      const handler = new ListTaskAgentNotesHandler(sprintTasks, taskAgentNotes);

      const result = await handler.handle({ projectId: PROJECT_A_ID, taskId: TASK_A_ID });

      expect(result.length).toBe(1);
      expect(result[0].content).toBe("Agent note for Task A");
    });

    it("should reject task from other project", async () => {
      const { sprintTasks, taskAgentNotes } = setupProjectWithData();
      addCrossProjectTask(sprintTasks);
      const handler = new ListTaskAgentNotesHandler(sprintTasks, taskAgentNotes);

      await expect(
        handler.handle({ projectId: PROJECT_A_ID, taskId: TASK_B_ID }),
      ).rejects.toThrow(ApplicationError);
    });
  });

  describe("GetProjectActivityHandler", () => {
    it("should return events respecting limit", async () => {
      const { auditEvents } = setupProjectWithData();
      auditEvents.events.push(
        { id: "evt-1", action: "event-1", entityType: "test", entityId: "1", occurredOnUtc: "2026-05-23T10:00:00.000Z" },
        { id: "evt-2", action: "event-2", entityType: "test", entityId: "2", occurredOnUtc: "2026-05-23T11:00:00.000Z" },
        { id: "evt-3", action: "event-3", entityType: "test", entityId: "3", occurredOnUtc: "2026-05-23T12:00:00.000Z" },
      );
      const handler = new GetProjectActivityHandler(auditEvents);

      const result = await handler.handle({ projectId: PROJECT_A_ID, limit: 2 });

      expect(result.length).toBe(2);
    });

    it("should clamp limit to max 50", async () => {
      const { auditEvents } = setupProjectWithData();
      for (let i = 0; i < 60; i++) {
        auditEvents.events.push({
          id: `evt-${i}`,
          action: `event-${i}`,
          entityType: "test",
          entityId: String(i),
          occurredOnUtc: new Date(2026, 4, 23, 10, 0, i).toISOString(),
        });
      }
      const handler = new GetProjectActivityHandler(auditEvents);

      const result = await handler.handle({ projectId: PROJECT_A_ID, limit: 100 });

      expect(result.length).toBeLessThanOrEqual(50);
    });
  });
});
