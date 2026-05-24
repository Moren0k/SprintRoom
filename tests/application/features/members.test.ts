import { describe, expect, it } from "vitest";
import {
  AddProjectMemberHandler,
  GetProjectMemberDetailHandler,
} from "../../../src/application/features/members";
import { Project } from "../../../src/domain/aggregates/project";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { UserStory } from "../../../src/domain/aggregates/user-story";
import { ProjectRole } from "../../../src/domain/enums/project-role";
import { TaskStatus } from "../../../src/domain/enums/task-status";
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

describe("Members", () => {
  it("AddProjectMember should require manage members permission", async () => {
    const users = new InMemoryUserRepository();
    const owner = TestData.createUser("Owner", "owner3@example.com");
    const candidate = TestData.createUser("Candidate", "candidate@example.com");
    await users.add(owner);
    await users.add(candidate);

    const projects = new InMemoryProjectRepository();
    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Proyecto"),
      ExternalReference.create("https://example.com/repo"),
      owner.id,
      new Date(),
    );
    await projects.add(project);

    const handler = new AddProjectMemberHandler(
      projects,
      users,
      new FakeUnitOfWork(),
      new FakeClock(new Date()),
    );
    const result = await handler.handle({
      requestContext: { userId: owner.id, systemRole: owner.systemRole },
      projectId: project.id,
      userId: candidate.id,
      projectRole: ProjectRole.Contributor,
    });

    expect(result.userId).toBe(candidate.id);
  });

  it("GetProjectMemberDetail should return assigned task metrics", async () => {
    const users = new InMemoryUserRepository();
    const owner = TestData.createUser("Owner", "owner4@example.com");
    const contributor = TestData.createUser("Contributor", "contributor2@example.com");
    await users.add(owner);
    await users.add(contributor);

    const projects = new InMemoryProjectRepository();
    const stories = new InMemoryUserStoryRepository();
    const tasks = new InMemorySprintTaskRepository();

    const now = new Date();
    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Proyecto"),
      ExternalReference.create("https://example.com/repo"),
      owner.id,
      now,
    );
    project.addMember(contributor.id, ProjectRole.Contributor, now);
    await projects.add(project);

    const story = UserStory.create(
      project.id,
      WorkItemName.create("HU", "historia de usuario"),
      Description.create("desc"),
      now,
    );
    await stories.add(story);

    const task = SprintTask.create(
      project.id,
      story.id,
      WorkItemName.create("Task", "tarea"),
      Description.create("desc"),
      now,
    );
    task.assignUser(contributor.id, now);
    task.updateStatus(TaskStatus.Completed, new Date(now.getTime() + 60_000));
    await tasks.add(task);

    const handler = new GetProjectMemberDetailHandler(
      projects,
      users,
      stories,
      tasks,
    );
    const result = await handler.handle({
      requestContext: { userId: owner.id, systemRole: owner.systemRole },
      projectId: project.id,
      userId: contributor.id,
    });

    expect(result.totalAssignedTasks).toBe(1);
    expect(result.assignedTasksCompletionRate).toBe(100);
  });
});
