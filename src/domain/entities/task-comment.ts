import { Entity } from "../abstractions/entity";
import type { TaskCommentId } from "../ids/task-comment-id";
import type { UserId } from "../ids/user-id";
import type { CommentBody } from "../value-objects/comment-body";

export class TaskComment extends Entity<TaskCommentId> {
  readonly authorId: UserId;
  readonly body: CommentBody;
  readonly createdOnUtc: Date;

  constructor(id: TaskCommentId, authorId: UserId, body: CommentBody, createdOnUtc: Date) {
    super(id);
    this.authorId = authorId;
    this.body = body;
    this.createdOnUtc = createdOnUtc;
  }
}
