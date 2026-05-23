import { describe, expect, it } from "vitest";
import { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import { TaskCommentAddedDomainEvent } from "../../../src/domain/events/task-comment-added-domain-event";
import { ProjectId } from "../../../src/domain/ids/project-id";
import { UserId } from "../../../src/domain/ids/user-id";
import { UserStoryId } from "../../../src/domain/ids/user-story-id";
import { CommentBody } from "../../../src/domain/value-objects/comment-body";
import { Description } from "../../../src/domain/value-objects/description";
import { WorkItemName } from "../../../src/domain/value-objects/work-item-name";

describe("SprintTask aggregate", () => {
  it("addComment should append immutable comment and raise domain event", () => {
    const now = new Date();
    const task = SprintTask.create(
      ProjectId.new(),
      UserStoryId.new(),
      WorkItemName.create("Crear tarea", "tarea"),
      Description.create("Descripcion"),
      now,
    );

    const comment = task.addComment(
      UserId.new(),
      CommentBody.create("Comentario inicial"),
      new Date(now.getTime() + 60_000),
    );

    expect(task.comments.length).toBe(1);
    expect(comment.body.value).toBe("Comentario inicial");
    expect(
      task.domainEvents.some((e) => e instanceof TaskCommentAddedDomainEvent),
    ).toBe(true);
  });

  it("assignUser should avoid duplicate assignments", () => {
    const userId = UserId.new();
    const now = new Date();
    const task = SprintTask.create(
      ProjectId.new(),
      UserStoryId.new(),
      WorkItemName.create("Crear tarea", "tarea"),
      Description.create("Descripcion"),
      now,
    );
    task.assignUser(userId, new Date(now.getTime() + 60_000));
    task.assignUser(userId, new Date(now.getTime() + 120_000));

    expect(task.assigneeIds.length).toBe(1);
    expect(task.assigneeIds).toContain(userId);
  });
});
