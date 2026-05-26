import { describe, expect, it } from "vitest";
import { Project } from "../../../src/domain/aggregates/project";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { UserStory } from "../../../src/domain/aggregates/user-story";
import { ProjectRole } from "../../../src/domain/enums/project-role";
import { UserStoryId } from "../../../src/domain/ids/user-story-id";
import { Description } from "../../../src/domain/value-objects/description";
import { ExternalReference } from "../../../src/domain/value-objects/external-reference";
import { ProjectName } from "../../../src/domain/value-objects/project-name";
import { WorkItemName } from "../../../src/domain/value-objects/work-item-name";
import {
  FakeClock,
  FakeUnitOfWork,
  InMemoryProjectRepository,
  InMemorySprintTaskRepository,
  InMemoryUserRepository,
  InMemoryUserStoryRepository,
} from "../support/fakes";
import { TestData } from "../support/test-data";
import {
  McpCreateTaskCommentHandler,
  McpCreateTaskHandler,
  McpCreateUserStoryHandler,
  McpUpdateTaskDetailsHandler,
  McpAssignTaskHandler,
} from "../../../src/application/features/mcp-write";
import { ApplicationError } from "../../../src/application/abstractions/application-error";

describe("MCP write handlers", () => {
  const owner = TestData.createUser("Owner", "owner@example.com");
  const assignee = TestData.createUser("Assignee", "assignee@example.com");
  const otherUser = TestData.createUser("Other", "other@example.com");

  function setupProjectAndStory() {
    const users = new InMemoryUserRepository();
    users.add(owner);
    users.add(assignee);

    const projects = new InMemoryProjectRepository();
    const stories = new InMemoryUserStoryRepository();
    const tasks = new InMemorySprintTaskRepository();

    const project = Project.create(
      ProjectName.create("Test Project"),
      Description.create("Test"),
      ExternalReference.create("https://example.com/repo"),
      owner.id,
      new Date(),
    );
    project.addMember(assignee.id, ProjectRole.Contributor, new Date());
    projects.add(project);

    const story = UserStory.create(
      project.id,
      WorkItemName.create("HU 1", "historia de usuario"),
      Description.create("desc"),
      new Date(),
    );
    stories.add(story);

    return { users, projects, stories, tasks, project, story };
  }

  describe("create_task_comment", () => {
    it("should add a comment to an existing task", async () => {
      const { projects, tasks, project } = setupProjectAndStory();
      const task = SprintTask.create(
        project.id,
        UserStoryId.new(),
        WorkItemName.create("Task", "tarea"),
        Description.create("desc"),
        new Date(),
      );
      tasks.add(task);

      const handler = new McpCreateTaskCommentHandler(
        tasks,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      const result = await handler.handle({
        projectId: project.id,
        taskId: task.id,
        body: "Test comment",
      });

      expect(result.taskId).toBe(task.id);
      expect(result.body).toBe("Test comment");
    });

    it("should reject empty body", async () => {
      const { projects, tasks, project } = setupProjectAndStory();
      const handler = new McpCreateTaskCommentHandler(
        tasks,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({ projectId: project.id, taskId: "anything", body: "   " }),
      ).rejects.toThrow(ApplicationError);
    });

    it("should reject body exceeding 2000 characters", async () => {
      const { projects, tasks, project } = setupProjectAndStory();
      const handler = new McpCreateTaskCommentHandler(
        tasks,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({ projectId: project.id, taskId: "anything", body: "x".repeat(2001) }),
      ).rejects.toThrow(ApplicationError);
    });

    it("should reject comment on non-existent task", async () => {
      const { projects, tasks, project } = setupProjectAndStory();
      const handler = new McpCreateTaskCommentHandler(
        tasks,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({ projectId: project.id, taskId: "nonexistent", body: "comment" }),
      ).rejects.toThrow(ApplicationError);
    });

    it("should reject comment on task from another project", async () => {
      const { projects, tasks, project } = setupProjectAndStory();
      const otherProject = Project.create(
        ProjectName.create("Other"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      projects.add(otherProject);

      const task = SprintTask.create(
        otherProject.id,
        UserStoryId.new(),
        WorkItemName.create("Task", "tarea"),
        Description.create("desc"),
        new Date(),
      );
      tasks.add(task);

      const handler = new McpCreateTaskCommentHandler(
        tasks,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({ projectId: project.id, taskId: task.id, body: "comment" }),
      ).rejects.toThrow(ApplicationError);
    });
  });

  describe("create_task", () => {
    it("should create a task without assignees", async () => {
      const { users, projects, stories, tasks, project, story } = setupProjectAndStory();

      const handler = new McpCreateTaskHandler(
        tasks,
        stories,
        users,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      const result = await handler.handle({
        projectId: project.id,
        userStoryId: story.id,
        title: "New Task",
        description: "Task description",
        assigneeIds: [],
      });

      expect(result.userStoryId).toBe(story.id);
      expect(result.title).toBe("New Task");
      expect(result.assigneeIds).toHaveLength(0);
    });

    it("should create a task with assignees", async () => {
      const { users, projects, stories, tasks, project, story } = setupProjectAndStory();

      const handler = new McpCreateTaskHandler(
        tasks,
        stories,
        users,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      const result = await handler.handle({
        projectId: project.id,
        userStoryId: story.id,
        title: "Assigned Task",
        description: "",
        assigneeIds: [assignee.id],
      });

      expect(result.assigneeIds).toHaveLength(1);
      expect(result.status).toBe("not_started");
    });

    it("should reject if user story does not exist", async () => {
      const { users, projects, stories, tasks, project } = setupProjectAndStory();

      const handler = new McpCreateTaskHandler(
        tasks,
        stories,
        users,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({
          projectId: project.id,
          userStoryId: "nonexistent",
          title: "Task",
          description: "",
          assigneeIds: [],
        }),
      ).rejects.toThrow(ApplicationError);
    });

    it("should reject if assignee does not exist", async () => {
      const { users, projects, stories, tasks, project, story } = setupProjectAndStory();

      const handler = new McpCreateTaskHandler(
        tasks,
        stories,
        users,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({
          projectId: project.id,
          userStoryId: story.id,
          title: "Task",
          description: "",
          assigneeIds: ["nonexistent-user"],
        }),
      ).rejects.toThrow(ApplicationError);
    });

    it("should reject if assignee is not a project member", async () => {
      const { users, projects, stories, tasks, project, story } = setupProjectAndStory();
      users.add(otherUser);

      const handler = new McpCreateTaskHandler(
        tasks,
        stories,
        users,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({
          projectId: project.id,
          userStoryId: story.id,
          title: "Task",
          description: "",
          assigneeIds: [otherUser.id],
        }),
      ).rejects.toThrow(ApplicationError);
    });
  });

  describe("create_user_story", () => {
    it("should create a user story", async () => {
      const projects = new InMemoryProjectRepository();
      const stories = new InMemoryUserStoryRepository();
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      projects.add(project);

      const handler = new McpCreateUserStoryHandler(
        stories,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      const result = await handler.handle({
        projectId: project.id,
        title: "New User Story",
        description: "Story description",
      });

      expect(result.title).toBe("New User Story");
      expect(result.description).toBe("Story description");
    });

    it("should create a user story without description", async () => {
      const projects = new InMemoryProjectRepository();
      const stories = new InMemoryUserStoryRepository();
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      projects.add(project);

      const handler = new McpCreateUserStoryHandler(
        stories,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      const result = await handler.handle({
        projectId: project.id,
        title: "Minimal Story",
        description: "",
      });

      expect(result.title).toBe("Minimal Story");
    });
  });

  describe("update_task_details", () => {
    it("should update task title", async () => {
      const { tasks, project } = setupProjectAndStory();
      const task = SprintTask.create(
        project.id,
        UserStoryId.new(),
        WorkItemName.create("Old Title", "tarea"),
        Description.create("desc"),
        new Date(),
      );
      tasks.add(task);

      const handler = new McpUpdateTaskDetailsHandler(
        tasks,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      const result = await handler.handle({
        projectId: project.id,
        taskId: task.id,
        title: "New Title",
        description: undefined,
      });

      expect(result.title).toBe("New Title");
      expect(result.description).toBe("desc");
    });

    it("should update task description", async () => {
      const { tasks, project } = setupProjectAndStory();
      const task = SprintTask.create(
        project.id,
        UserStoryId.new(),
        WorkItemName.create("Title", "tarea"),
        Description.create("Old desc"),
        new Date(),
      );
      tasks.add(task);

      const handler = new McpUpdateTaskDetailsHandler(
        tasks,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      const result = await handler.handle({
        projectId: project.id,
        taskId: task.id,
        title: undefined,
        description: "New desc",
      });

      expect(result.title).toBe("Title");
      expect(result.description).toBe("New desc");
    });

    it("should reject with no fields to update", async () => {
      const { tasks, project } = setupProjectAndStory();

      const handler = new McpUpdateTaskDetailsHandler(
        tasks,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({
          projectId: project.id,
          taskId: "anything",
          title: undefined,
          description: undefined,
        }),
      ).rejects.toThrow(ApplicationError);
    });

    it("should reject if task does not exist", async () => {
      const { tasks, project } = setupProjectAndStory();

      const handler = new McpUpdateTaskDetailsHandler(
        tasks,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({
          projectId: project.id,
          taskId: "nonexistent",
          title: "New Title",
          description: undefined,
        }),
      ).rejects.toThrow(ApplicationError);
    });
  });

  describe("assign_task", () => {
    it("should assign users to a task", async () => {
      const { users, projects, tasks, project } = setupProjectAndStory();
      const task = SprintTask.create(
        project.id,
        UserStoryId.new(),
        WorkItemName.create("Task", "tarea"),
        Description.create("desc"),
        new Date(),
      );
      tasks.add(task);

      const handler = new McpAssignTaskHandler(
        tasks,
        users,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      const result = await handler.handle({
        projectId: project.id,
        taskId: task.id,
        assigneeIds: [assignee.id],
      });

      expect(result.assigneeIds).toHaveLength(1);
    });

    it("should remove all assignees", async () => {
      const { users, projects, tasks, project } = setupProjectAndStory();
      const task = SprintTask.create(
        project.id,
        UserStoryId.new(),
        WorkItemName.create("Task", "tarea"),
        Description.create("desc"),
        new Date(),
      );
      task.assignUser(assignee.id, new Date());
      tasks.add(task);

      const handler = new McpAssignTaskHandler(
        tasks,
        users,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      const result = await handler.handle({
        projectId: project.id,
        taskId: task.id,
        assigneeIds: [],
      });

      expect(result.assigneeIds).toHaveLength(0);
    });

    it("should reject non-existent user", async () => {
      const { users, projects, tasks, project } = setupProjectAndStory();
      const task = SprintTask.create(
        project.id,
        UserStoryId.new(),
        WorkItemName.create("Task", "tarea"),
        Description.create("desc"),
        new Date(),
      );
      tasks.add(task);

      const handler = new McpAssignTaskHandler(
        tasks,
        users,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({
          projectId: project.id,
          taskId: task.id,
          assigneeIds: ["nonexistent"],
        }),
      ).rejects.toThrow(ApplicationError);
    });

    it("should reject user not in project", async () => {
      const { users, projects, tasks, project } = setupProjectAndStory();
      users.add(otherUser);

      const task = SprintTask.create(
        project.id,
        UserStoryId.new(),
        WorkItemName.create("Task", "tarea"),
        Description.create("desc"),
        new Date(),
      );
      tasks.add(task);

      const handler = new McpAssignTaskHandler(
        tasks,
        users,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({
          projectId: project.id,
          taskId: task.id,
          assigneeIds: [otherUser.id],
        }),
      ).rejects.toThrow(ApplicationError);
    });

    it("should reject if task does not exist", async () => {
      const { users, projects, tasks, project } = setupProjectAndStory();

      const handler = new McpAssignTaskHandler(
        tasks,
        users,
        projects,
        new FakeUnitOfWork(),
        new FakeClock(new Date()),
      );

      await expect(
        handler.handle({
          projectId: project.id,
          taskId: "nonexistent",
          assigneeIds: [],
        }),
      ).rejects.toThrow(ApplicationError);
    });
  });
});
