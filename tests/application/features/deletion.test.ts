import { describe, expect, it } from "vitest";
import {
  DeleteProjectHandler,
  DeleteSprintTaskHandler,
} from "../../../src/application/features/deletion";
import { Project } from "../../../src/domain/aggregates/project";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { UserStory } from "../../../src/domain/aggregates/user-story";
import { DomainError } from "../../../src/domain/errors/domain-error";
import { UserStoryId } from "../../../src/domain/ids/user-story-id";
import { Description } from "../../../src/domain/value-objects/description";
import { ExternalReference } from "../../../src/domain/value-objects/external-reference";
import { ProjectName } from "../../../src/domain/value-objects/project-name";
import { WorkItemName } from "../../../src/domain/value-objects/work-item-name";
import {
  FakeUnitOfWork,
  InMemoryProjectRepository,
  InMemorySprintTaskRepository,
  InMemoryUserStoryRepository,
} from "../support/fakes";
import { TestData } from "../support/test-data";

describe("Deletion", () => {
  it("DeleteSprintTask should remove task when confirmation matches", async () => {
    const owner = TestData.createUser("Owner", "owner8@example.com");
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

    const handler = new DeleteSprintTaskHandler(
      projects,
      tasks,
      new FakeUnitOfWork(),
    );
    await handler.handle({
      requestContext: { userId: owner.id, systemRole: owner.systemRole },
      sprintTaskId: task.id,
      confirmationName: "Task",
    });

    const deleted = await tasks.getById(task.id);
    expect(deleted).toBeNull();
  });

  it("DeleteProject should reject when still has stories", async () => {
    const owner = TestData.createUser("Owner", "owner9@example.com");
    const projects = new InMemoryProjectRepository();
    const stories = new InMemoryUserStoryRepository();
    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Proyecto"),
      ExternalReference.create("https://example.com/repo"),
      owner.id,
      new Date(),
    );
    await projects.add(project);
    await stories.add(
      UserStory.create(
        project.id,
        WorkItemName.create("HU", "historia de usuario"),
        Description.create("desc"),
        new Date(),
      ),
    );

    const handler = new DeleteProjectHandler(
      projects,
      stories,
      new InMemorySprintTaskRepository(),
      new FakeUnitOfWork(),
    );

    await expect(
      handler.handle({
        requestContext: { userId: owner.id, systemRole: owner.systemRole },
        projectId: project.id,
        confirmationName: "SprintRoom",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
