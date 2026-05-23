import { describe, expect, it } from "vitest";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { UserStory } from "../../../src/domain/aggregates/user-story";
import { ProjectId } from "../../../src/domain/ids/project-id";
import { ProjectProgressCalculator } from "../../../src/domain/services/project-progress-calculator";
import { Description } from "../../../src/domain/value-objects/description";
import { WorkItemName } from "../../../src/domain/value-objects/work-item-name";

describe("ProjectProgressCalculator", () => {
  it("calculate should average user story progress", () => {
    const projectId = ProjectId.new();
    const now = new Date();
    const later = new Date(now.getTime() + 60_000);

    const storyA = UserStory.create(
      projectId,
      WorkItemName.create("Historia A", "historia de usuario"),
      Description.create("A"),
      now,
    );
    const storyB = UserStory.create(
      projectId,
      WorkItemName.create("Historia B", "historia de usuario"),
      Description.create("B"),
      now,
    );

    const taskA1 = SprintTask.create(
      projectId,
      storyA.id,
      WorkItemName.create("Tarea A1", "tarea"),
      Description.create("A1"),
      now,
    );
    taskA1.markCompleted(later);

    const taskA2 = SprintTask.create(
      projectId,
      storyA.id,
      WorkItemName.create("Tarea A2", "tarea"),
      Description.create("A2"),
      now,
    );

    const taskB1 = SprintTask.create(
      projectId,
      storyB.id,
      WorkItemName.create("Tarea B1", "tarea"),
      Description.create("B1"),
      now,
    );
    taskB1.markCompleted(later);

    const progress = ProjectProgressCalculator.calculate(
      [storyA, storyB],
      [taskA1, taskA2, taskB1],
    );

    expect(progress).toBe(75);
  });
});
