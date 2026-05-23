import { describe, expect, it } from "vitest";
import {
  AddTaskCommentHandler,
  CreateSprintTaskHandler,
} from "../../../src/application/features/tasks";
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

describe("Tasks", () => {
  it("CreateSprintTask should persist assignments", async () => {
    const users = new InMemoryUserRepository();
    const owner = TestData.createUser("Owner", "owner6@example.com");
    const assignee = TestData.createUser("Assignee", "assignee@example.com");
    await users.add(owner);
    await users.add(assignee);

    const projects = new InMemoryProjectRepository();
    const stories = new InMemoryUserStoryRepository();
    const tasks = new InMemorySprintTaskRepository();
    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Proyecto"),
      ExternalReference.create("https://example.com/repo"),
      owner.id,
      new Date(),
    );
    project.addMember(assignee.id, ProjectRole.Contributor, new Date());
    await projects.add(project);

    const story = UserStory.create(
      project.id,
      WorkItemName.create("HU", "historia de usuario"),
      Description.create("desc"),
      new Date(),
    );
    await stories.add(story);

    const handler = new CreateSprintTaskHandler(
      projects,
      users,
      stories,
      tasks,
      new FakeUnitOfWork(),
      new FakeClock(new Date()),
    );

    const result = await handler.handle({
      requestContext: { userId: owner.id, systemRole: owner.systemRole },
      userStoryId: story.id,
      title: "Task",
      description: "Descripcion",
      assigneeIds: [assignee.id],
    });

    expect(result.assigneeIds.length).toBe(1);
  });

  it("AddTaskComment should append comment", async () => {
    const owner = TestData.createUser("Owner", "owner7@example.com");
    const projects = new InMemoryProjectRepository();
    const tasks = new InMemorySprintTaskRepository();
    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Proyecto"),
      ExternalReference.create("https://example.com/repo"),
      owner.id,
      new Date(),
    );
    await projects.add(project);

    const task = SprintTask.create(
      project.id,
      UserStoryId.new(),
      WorkItemName.create("Task", "tarea"),
      Description.create("desc"),
      new Date(),
    );
    await tasks.add(task);

    const handler = new AddTaskCommentHandler(
      projects,
      tasks,
      new FakeUnitOfWork(),
      new FakeClock(new Date()),
    );
    const result = await handler.handle({
      requestContext: { userId: owner.id, systemRole: owner.systemRole },
      sprintTaskId: task.id,
      body: "Hola",
    });

    expect(result.body).toBe("Hola");
  });
});
