import { AggregateRoot } from "../abstractions/aggregate-root";
import { TaskComment } from "../entities/task-comment";
import { TaskCommentAddedDomainEvent } from "../events/task-comment-added-domain-event";
import type { ProjectId } from "../ids/project-id";
import { SprintTaskId } from "../ids/sprint-task-id";
import { TaskCommentId } from "../ids/task-comment-id";
import type { UserId } from "../ids/user-id";
import type { UserStoryId } from "../ids/user-story-id";
import type { CommentBody } from "../value-objects/comment-body";
import type { Description } from "../value-objects/description";
import type { WorkItemName } from "../value-objects/work-item-name";

export class SprintTask extends AggregateRoot<SprintTaskId> {
  private readonly _projectId: ProjectId;
  private readonly _userStoryId: UserStoryId;
  private _title: WorkItemName;
  private _description: Description;
  private _isCompleted = false;
  private readonly _createdOnUtc: Date;
  private _updatedOnUtc: Date;
  private readonly _comments: TaskComment[] = [];
  private readonly _assigneeIds: UserId[] = [];

  private constructor(
    id: SprintTaskId,
    projectId: ProjectId,
    userStoryId: UserStoryId,
    title: WorkItemName,
    description: Description,
    createdOnUtc: Date,
  ) {
    super(id);
    this._projectId = projectId;
    this._userStoryId = userStoryId;
    this._title = title;
    this._description = description;
    this._createdOnUtc = createdOnUtc;
    this._updatedOnUtc = createdOnUtc;
  }

  get projectId(): ProjectId {
    return this._projectId;
  }
  get userStoryId(): UserStoryId {
    return this._userStoryId;
  }
  get title(): WorkItemName {
    return this._title;
  }
  get description(): Description {
    return this._description;
  }
  get isCompleted(): boolean {
    return this._isCompleted;
  }
  get createdOnUtc(): Date {
    return this._createdOnUtc;
  }
  get updatedOnUtc(): Date {
    return this._updatedOnUtc;
  }
  get comments(): ReadonlyArray<TaskComment> {
    return this._comments;
  }
  get assigneeIds(): ReadonlyArray<UserId> {
    return this._assigneeIds;
  }

  static create(
    projectId: ProjectId,
    userStoryId: UserStoryId,
    title: WorkItemName,
    description: Description,
    createdOnUtc: Date,
  ): SprintTask {
    return new SprintTask(
      SprintTaskId.new(),
      projectId,
      userStoryId,
      title,
      description,
      createdOnUtc,
    );
  }

  static rehydrate(
    id: SprintTaskId,
    projectId: ProjectId,
    userStoryId: UserStoryId,
    title: WorkItemName,
    description: Description,
    isCompleted: boolean,
    createdOnUtc: Date,
    updatedOnUtc: Date,
    assigneeIds: ReadonlyArray<UserId>,
    comments: ReadonlyArray<TaskComment>,
  ): SprintTask {
    const sprintTask = new SprintTask(
      id,
      projectId,
      userStoryId,
      title,
      description,
      createdOnUtc,
    );
    sprintTask._isCompleted = isCompleted;
    sprintTask._updatedOnUtc = updatedOnUtc;
    sprintTask._assigneeIds.push(...assigneeIds);
    sprintTask._comments.push(...comments);
    return sprintTask;
  }

  update(title: WorkItemName, description: Description, updatedOnUtc: Date): void {
    this._title = title;
    this._description = description;
    this._updatedOnUtc = updatedOnUtc;
  }

  markCompleted(updatedOnUtc: Date): void {
    this._isCompleted = true;
    this._updatedOnUtc = updatedOnUtc;
  }

  reopen(updatedOnUtc: Date): void {
    this._isCompleted = false;
    this._updatedOnUtc = updatedOnUtc;
  }

  assignUser(userId: UserId, updatedOnUtc: Date): void {
    if (this._assigneeIds.includes(userId)) {
      return;
    }
    this._assigneeIds.push(userId);
    this._updatedOnUtc = updatedOnUtc;
  }

  removeUserAssignment(userId: UserId, updatedOnUtc: Date): void {
    const index = this._assigneeIds.indexOf(userId);
    if (index !== -1) {
      this._assigneeIds.splice(index, 1);
      this._updatedOnUtc = updatedOnUtc;
    }
  }

  addComment(authorId: UserId, body: CommentBody, createdOnUtc: Date): TaskComment {
    const comment = new TaskComment(
      TaskCommentId.new(),
      authorId,
      body,
      createdOnUtc,
    );
    this._comments.push(comment);
    this._updatedOnUtc = createdOnUtc;
    this.raise(
      new TaskCommentAddedDomainEvent(this.id, comment.id, createdOnUtc),
    );
    return comment;
  }
}
