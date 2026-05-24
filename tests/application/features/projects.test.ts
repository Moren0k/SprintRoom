import { describe, expect, it } from "vitest";
import {
  CreateProjectHandler,
  ListProjectsHandler,
} from "../../../src/application/features/projects";
import { Project } from "../../../src/domain/aggregates/project";
import { ProjectRole } from "../../../src/domain/enums/project-role";
import { TaskStatus } from "../../../src/domain/enums/task-status";
import { Description } from "../../../src/domain/value-objects/description";
import { ExternalReference } from "../../../src/domain/value-objects/external-reference";
import { ProjectName } from "../../../src/domain/value-objects/project-name";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { UserStory } from "../../../src/domain/aggregates/user-story";
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

describe("Projects", () => {
  it("CreateProject should persist project and initial members", async () => {
    const users = new InMemoryUserRepository();
    const owner = TestData.createUser("Owner", "owner@example.com");
    const contributor = TestData.createUser("Contributor", "contributor@example.com");
    await users.add(owner);
    await users.add(contributor);

    const handler = new CreateProjectHandler(
      new InMemoryProjectRepository(),
      users,
      new FakeUnitOfWork(),
      new FakeClock(new Date()),
    );

    const result = await handler.handle({
      requestContext: { userId: owner.id, systemRole: owner.systemRole },
      name: "SprintRoom",
      description: "Proyecto",
      externalReference: "https://example.com/repo",
      initialMembers: [
        { userId: contributor.id, projectRole: ProjectRole.Contributor },
      ],
    });

    expect(result.members.length).toBe(2);
  });

  it("ListProjects should return calculated progress", async () => {
    const owner = TestData.createUser("Owner", "owner2@example.com");
    const projectRepository = new InMemoryProjectRepository();
    const storyRepository = new InMemoryUserStoryRepository();
    const taskRepository = new InMemorySprintTaskRepository();
    const now = new Date();

    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Proyecto"),
      ExternalReference.create("https://example.com/repo"),
      owner.id,
      now,
    );
    await projectRepository.add(project);

    const story = UserStory.create(
      project.id,
      WorkItemName.create("HU", "historia de usuario"),
      Description.create("desc"),
      now,
    );
    await storyRepository.add(story);

    const task = SprintTask.create(
      project.id,
      story.id,
      WorkItemName.create("Task", "tarea"),
      Description.create("desc"),
      now,
    );
    task.updateStatus(TaskStatus.Completed, new Date(now.getTime() + 60_000));
    await taskRepository.add(task);

    const handler = new ListProjectsHandler(
      projectRepository,
      storyRepository,
      taskRepository,
    );
    const result = await handler.handle({
      requestContext: { userId: owner.id, systemRole: owner.systemRole },
    });

    expect(result.length).toBe(1);
    expect(result[0].progress).toBe(100);
  });
});
