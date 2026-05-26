import { SprintTask as SprintTaskAggregate } from "../../domain/aggregates/sprint-task";
import { UserStory as UserStoryAggregate } from "../../domain/aggregates/user-story";
import { ProjectId } from "../../domain/ids/project-id";
import { SprintTaskId } from "../../domain/ids/sprint-task-id";
import { UserStoryId } from "../../domain/ids/user-story-id";
import { UserId } from "../../domain/ids/user-id";
import { CommentBody } from "../../domain/value-objects/comment-body";
import { Description } from "../../domain/value-objects/description";
import { WorkItemName } from "../../domain/value-objects/work-item-name";
import { ApplicationError } from "../abstractions/application-error";
import type { CommandHandler } from "../abstractions/messages";
import type {
  Clock,
  ProjectRepository,
  SprintTaskRepository,
  UnitOfWork,
  UserRepository,
  UserStoryRepository,
} from "../abstractions/ports";

/* ===================== MCP: create_task_comment ============== */

export interface McpCreateTaskCommentCommand {
  readonly projectId: string;
  readonly taskId: string;
  readonly body: string;
}

export interface McpCreateTaskCommentResult {
  readonly id: string;
  readonly taskId: string;
  readonly body: string;
  readonly createdOnUtc: string;
}

export class McpCreateTaskCommentHandler
  implements CommandHandler<McpCreateTaskCommentCommand, McpCreateTaskCommentResult>
{
  private static readonly MAX_BODY_LENGTH = 2000;

  constructor(
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: McpCreateTaskCommentCommand): Promise<McpCreateTaskCommentResult> {
    if (command.body.trim().length === 0) {
      throw new ApplicationError("El comentario no puede estar vacio.");
    }
    if (command.body.length > McpCreateTaskCommentHandler.MAX_BODY_LENGTH) {
      throw new ApplicationError(
        `El comentario no puede exceder ${McpCreateTaskCommentHandler.MAX_BODY_LENGTH} caracteres.`,
      );
    }

    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(command.taskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }
    if (task.projectId !== command.projectId) {
      throw new ApplicationError("La tarea no pertenece a este proyecto.");
    }

    const project = await this.projectRepository.getById(task.projectId);
    const authorId = project?.ownerId ?? UserId.from("00000000-0000-0000-0000-000000000000");

    const comment = task.addComment(
      authorId,
      CommentBody.create(command.body),
      this.clock.utcNow,
    );
    await this.unitOfWork.saveChanges();

    return {
      id: comment.id,
      taskId: command.taskId,
      body: command.body,
      createdOnUtc: comment.createdOnUtc.toISOString(),
    };
  }
}

/* ===================== MCP: create_task ====================== */

export interface McpCreateTaskCommand {
  readonly projectId: string;
  readonly userStoryId: string;
  readonly title: string;
  readonly description: string;
  readonly assigneeIds: ReadonlyArray<string>;
}

export interface McpCreateTaskResult {
  readonly taskId: string;
  readonly userStoryId: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly assigneeIds: ReadonlyArray<string>;
}

export class McpCreateTaskHandler
  implements CommandHandler<McpCreateTaskCommand, McpCreateTaskResult>
{
  constructor(
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly userRepository: UserRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: McpCreateTaskCommand): Promise<McpCreateTaskResult> {
    const story = await this.userStoryRepository.getById(
      UserStoryId.from(command.userStoryId),
    );
    if (story === null) {
      throw new ApplicationError("La historia de usuario no existe.");
    }
    if (story.projectId !== command.projectId) {
      throw new ApplicationError("La historia de usuario no pertenece a este proyecto.");
    }

    const titleVo = WorkItemName.create(command.title, "tarea");
    const descriptionVo = Description.create(command.description);

    const assigneeIds = command.assigneeIds.map((id) => UserId.from(id));
    if (assigneeIds.length > 0) {
      const existingUsers = await this.userRepository.getByIds(assigneeIds);
      const existingIds = new Set(existingUsers.map((item) => item.id));
      const project = await this.projectRepository.getById(story.projectId);
      for (const assigneeId of assigneeIds) {
        if (!existingIds.has(assigneeId)) {
          throw new ApplicationError(
            `El usuario asignado ${assigneeId} no existe.`,
          );
        }
        if (project !== null && !project.hasMember(assigneeId)) {
          throw new ApplicationError(
            `El usuario asignado ${assigneeId} no pertenece al proyecto.`,
          );
        }
      }
    }

    const task = SprintTaskAggregate.create(
      story.projectId,
      story.id,
      titleVo,
      descriptionVo,
      this.clock.utcNow,
    );

    for (const assigneeId of assigneeIds) {
      task.assignUser(assigneeId, this.clock.utcNow);
    }

    await this.sprintTaskRepository.add(task);
    await this.unitOfWork.saveChanges();

    return {
      taskId: task.id,
      userStoryId: command.userStoryId,
      title: titleVo.value,
      description: descriptionVo.value,
      status: task.status,
      assigneeIds: task.assigneeIds.map((id) => id as string),
    };
  }
}

/* ===================== MCP: create_user_story ================ */

export interface McpCreateUserStoryCommand {
  readonly projectId: string;
  readonly title: string;
  readonly description: string;
}

export interface McpCreateUserStoryResult {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly createdOnUtc: string;
}

export class McpCreateUserStoryHandler
  implements CommandHandler<McpCreateUserStoryCommand, McpCreateUserStoryResult>
{
  constructor(
    private readonly userStoryRepository: UserStoryRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: McpCreateUserStoryCommand): Promise<McpCreateUserStoryResult> {
    const titleVo = WorkItemName.create(command.title, "historia de usuario");
    const descriptionVo = Description.create(command.description);

    const story = UserStoryAggregate.create(
      ProjectId.from(command.projectId),
      titleVo,
      descriptionVo,
      this.clock.utcNow,
    );

    await this.userStoryRepository.add(story);
    await this.unitOfWork.saveChanges();

    return {
      id: story.id,
      title: titleVo.value,
      description: descriptionVo.value,
      createdOnUtc: story.createdOnUtc.toISOString(),
    };
  }
}

/* ===================== MCP: update_task_details ============== */

export interface McpUpdateTaskDetailsCommand {
  readonly projectId: string;
  readonly taskId: string;
  readonly title?: string;
  readonly description?: string;
}

export interface McpUpdateTaskDetailsResult {
  readonly taskId: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly assigneeIds: ReadonlyArray<string>;
}

export class McpUpdateTaskDetailsHandler
  implements CommandHandler<McpUpdateTaskDetailsCommand, McpUpdateTaskDetailsResult>
{
  constructor(
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: McpUpdateTaskDetailsCommand): Promise<McpUpdateTaskDetailsResult> {
    if (command.title === undefined && command.description === undefined) {
      throw new ApplicationError("Debe especificar al menos title o description para actualizar.");
    }

    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(command.taskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }
    if (task.projectId !== command.projectId) {
      throw new ApplicationError("La tarea no pertenece a este proyecto.");
    }

    const title = command.title !== undefined
      ? WorkItemName.create(command.title, "tarea")
      : task.title;
    const description = command.description !== undefined
      ? Description.create(command.description)
      : task.description;

    task.update(title, description, this.clock.utcNow);
    await this.unitOfWork.saveChanges();

    return {
      taskId: task.id,
      title: task.title.value,
      description: task.description.value,
      status: task.status,
      assigneeIds: task.assigneeIds.map((id) => id as string),
    };
  }
}

/* ===================== MCP: assign_task ====================== */

export interface McpAssignTaskCommand {
  readonly projectId: string;
  readonly taskId: string;
  readonly assigneeIds: ReadonlyArray<string>;
}

export interface McpAssignTaskResult {
  readonly taskId: string;
  readonly assigneeIds: ReadonlyArray<string>;
  readonly status: string;
}

export class McpAssignTaskHandler
  implements CommandHandler<McpAssignTaskCommand, McpAssignTaskResult>
{
  constructor(
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly userRepository: UserRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: McpAssignTaskCommand): Promise<McpAssignTaskResult> {
    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(command.taskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }
    if (task.projectId !== command.projectId) {
      throw new ApplicationError("La tarea no pertenece a este proyecto.");
    }

    const newAssigneeIds = command.assigneeIds.map((id) => UserId.from(id));
    const existingUsers = newAssigneeIds.length > 0
      ? await this.userRepository.getByIds(newAssigneeIds)
      : [];
    const existingIds = new Set(existingUsers.map((item) => item.id));
    const project = await this.projectRepository.getById(task.projectId);

    for (const assigneeId of newAssigneeIds) {
      if (!existingIds.has(assigneeId)) {
        throw new ApplicationError(
          `El usuario asignado ${assigneeId} no existe.`,
        );
      }
      if (project !== null && !project.hasMember(assigneeId)) {
        throw new ApplicationError(
          `El usuario asignado ${assigneeId} no pertenece al proyecto.`,
        );
      }
    }

    const currentIds = new Set(task.assigneeIds.map((id) => id as string));
    for (const id of task.assigneeIds) {
      if (!newAssigneeIds.includes(id)) {
        task.removeUserAssignment(id, this.clock.utcNow);
      }
    }
    for (const newId of newAssigneeIds) {
      if (!currentIds.has(newId as string)) {
        task.assignUser(newId, this.clock.utcNow);
      }
    }

    await this.unitOfWork.saveChanges();

    return {
      taskId: task.id,
      assigneeIds: task.assigneeIds.map((id) => id as string),
      status: task.status,
    };
  }
}
