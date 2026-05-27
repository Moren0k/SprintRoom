import { describe, expect, it } from "vitest";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { UserStory } from "../../../src/domain/aggregates/user-story";
import { DomainError } from "../../../src/domain/errors/domain-error";
import { TaskStatus } from "../../../src/domain/enums/task-status";
import { ProjectId } from "../../../src/domain/ids/project-id";
import { Description } from "../../../src/domain/value-objects/description";
import { WorkItemName } from "../../../src/domain/value-objects/work-item-name";

describe("UserStory aggregate", () => {
  it("calculateProgress should average task status progress", () => {
    const projectId = ProjectId.new();
    const now = new Date();
    const story = UserStory.create(
      projectId,
      WorkItemName.create("Onboarding", "historia de usuario"),
      Description.create("Flujo de registro"),
      now,
    );

    const taskA = SprintTask.create(
      projectId,
      story.id,
      WorkItemName.create("Crear formulario", "tarea"),
      Description.create("Formulario"),
      now,
    );
    taskA.updateStatus(TaskStatus.Review, new Date(now.getTime() + 60_000));

    const taskB = SprintTask.create(
      projectId,
      story.id,
      WorkItemName.create("Enviar a login", "tarea"),
      Description.create("Redireccion"),
      now,
    );

    const progress = story.calculateProgress([taskA, taskB]);
    expect(progress).toBe(45);
  });

  it("calculateProgress should reject tasks from different project", () => {
    const story = UserStory.create(
      ProjectId.new(),
      WorkItemName.create("Onboarding", "historia de usuario"),
      Description.create("Flujo"),
      new Date(),
    );

    const task = SprintTask.create(
      ProjectId.new(),
      story.id,
      WorkItemName.create("Crear formulario", "tarea"),
      Description.create("Formulario"),
      new Date(),
    );

    expect(() => story.calculateProgress([task])).toThrow(DomainError);
  });
});
