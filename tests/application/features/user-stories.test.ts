import { describe, expect, it } from "vitest";
import { CreateUserStoryHandler } from "../../../src/application/features/user-stories";
import { Project } from "../../../src/domain/aggregates/project";
import { Description } from "../../../src/domain/value-objects/description";
import { ExternalReference } from "../../../src/domain/value-objects/external-reference";
import { ProjectName } from "../../../src/domain/value-objects/project-name";
import {
  FakeClock,
  FakeUnitOfWork,
  InMemoryProjectRepository,
  InMemoryUserStoryRepository,
} from "../support/fakes";
import { TestData } from "../support/test-data";

describe("UserStories", () => {
  it("CreateUserStory should persist story", async () => {
    const owner = TestData.createUser("Owner", "owner5@example.com");
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

    const handler = new CreateUserStoryHandler(
      projects,
      stories,
      new FakeUnitOfWork(),
      new FakeClock(new Date()),
    );
    const result = await handler.handle({
      requestContext: { userId: owner.id, systemRole: owner.systemRole },
      projectId: project.id,
      title: "HU-1",
      description: "Descripcion",
    });

    expect(result.projectId).toBe(project.id);
  });
});
