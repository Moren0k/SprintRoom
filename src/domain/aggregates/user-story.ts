import { AggregateRoot } from "../abstractions/aggregate-root";
import { DomainError } from "../errors/domain-error";
import type { ProjectId } from "../ids/project-id";
import { UserStoryId } from "../ids/user-story-id";
import type { Description } from "../value-objects/description";
import type { WorkItemName } from "../value-objects/work-item-name";
import type { SprintTask } from "./sprint-task";
import { TaskStatus } from "../enums/task-status";

export class UserStory extends AggregateRoot<UserStoryId> {
  private readonly _projectId: ProjectId;
  private _title: WorkItemName;
  private _description: Description;
  private readonly _createdOnUtc: Date;
  private _updatedOnUtc: Date;

  private constructor(
    id: UserStoryId,
    projectId: ProjectId,
    title: WorkItemName,
    description: Description,
    createdOnUtc: Date,
  ) {
    super(id);
    this._projectId = projectId;
    this._title = title;
    this._description = description;
    this._createdOnUtc = createdOnUtc;
    this._updatedOnUtc = createdOnUtc;
  }

  get projectId(): ProjectId {
    return this._projectId;
  }
  get title(): WorkItemName {
    return this._title;
  }
  get description(): Description {
    return this._description;
  }
  get createdOnUtc(): Date {
    return this._createdOnUtc;
  }
  get updatedOnUtc(): Date {
    return this._updatedOnUtc;
  }

  static create(
    projectId: ProjectId,
    title: WorkItemName,
    description: Description,
    createdOnUtc: Date,
  ): UserStory {
    return new UserStory(UserStoryId.new(), projectId, title, description, createdOnUtc);
  }

  static rehydrate(
    id: UserStoryId,
    projectId: ProjectId,
    title: WorkItemName,
    description: Description,
    createdOnUtc: Date,
    updatedOnUtc: Date,
  ): UserStory {
    const userStory = new UserStory(id, projectId, title, description, createdOnUtc);
    userStory._updatedOnUtc = updatedOnUtc;
    return userStory;
  }

  update(title: WorkItemName, description: Description, updatedOnUtc: Date): void {
    this._title = title;
    this._description = description;
    this._updatedOnUtc = updatedOnUtc;
  }

  /**
   * Calcula el porcentaje de avance de la historia a partir de las tareas
   * que le pertenecen. Las tareas se filtran por `userStoryId` antes del
   * calculo. Si alguna tarea pertenece a otro proyecto se lanza error.
   */
  calculateProgress(tasks: ReadonlyArray<SprintTask>): number {
    if (tasks === null || tasks === undefined) {
      throw new TypeError("Las tareas son obligatorias.");
    }
    const storyTasks = tasks.filter((task) => task.userStoryId === this.id);
    if (storyTasks.length === 0) {
      return 0;
    }
    if (storyTasks.some((task) => task.projectId !== this._projectId)) {
      throw new DomainError(
        "Todas las tareas deben pertenecer al mismo proyecto de la historia de usuario.",
      );
    }
    const completed = storyTasks.filter((task) => task.status === TaskStatus.Completed).length;
    return (completed * 100) / storyTasks.length;
  }
}
