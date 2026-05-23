import type { DomainEvent } from "../abstractions/domain-event";
import type { SprintTaskId } from "../ids/sprint-task-id";
import type { TaskCommentId } from "../ids/task-comment-id";

export class TaskCommentAddedDomainEvent implements DomainEvent {
  readonly taskId: SprintTaskId;
  readonly commentId: TaskCommentId;
  readonly occurredOnUtc: Date;

  constructor(taskId: SprintTaskId, commentId: TaskCommentId, occurredOnUtc: Date) {
    this.taskId = taskId;
    this.commentId = commentId;
    this.occurredOnUtc = occurredOnUtc;
  }
}
