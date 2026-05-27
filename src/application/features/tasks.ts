import type { SprintTask } from "../../domain/aggregates/sprint-task";
import { SprintTask as SprintTaskAggregate } from "../../domain/aggregates/sprint-task";
import { PermissionAction } from "../../domain/enums/permission-action";
import { SystemRole } from "../../domain/enums/system-role";
import { TaskStatus } from "../../domain/enums/task-status";
import { ProjectId } from "../../domain/ids/project-id";
import { SprintTaskId } from "../../domain/ids/sprint-task-id";
import { UserId } from "../../domain/ids/user-id";
import { UserStoryId } from "../../domain/ids/user-story-id";
import { VisibilityPolicy } from "../../domain/policies/visibility-policy";
import { CommentBody } from "../../domain/value-objects/comment-body";
import { Description } from "../../domain/value-objects/description";
import { WorkItemName } from "../../domain/value-objects/work-item-name";
import { ApplicationError } from "../abstractions/application-error";
import type {
  CommandHandler,
  QueryHandler,
} from "../abstractions/messages";
import type {
  Clock,
  ProjectRepository,
  SprintTaskRepository,
  TaskAgentNoteRepository,
  UnitOfWork,
  UserRepository,
  UserStoryRepository,
} from "../abstractions/ports";
import type { RequestContext } from "../abstractions/request-context";
import type {
  TaskCommentDto,
  TaskDetailDto,
  TaskSummaryDto,
} from "../models/application-dtos";
import { ProjectAccess } from "./project-access";

/* ============================ Mapeos compartidos ========================== */

export const TaskMappings = {
  toSummaryDto(task: SprintTask): TaskSummaryDto {
    return {
      sprintTaskId: task.id,
      projectId: task.projectId,
      userStoryId: task.userStoryId,
      title: task.title.value,
      description: task.description.value,
      status: task.status,
      isCompleted: task.isCompleted,
      assigneeIds: task.assigneeIds.map((id) => id as string),
      commentCount: task.comments.length,
    };
  },

  toDetailDto(task: SprintTask): TaskDetailDto {
    return {
      sprintTaskId: task.id,
      projectId: task.projectId,
      userStoryId: task.userStoryId,
      title: task.title.value,
      description: task.description.value,
      status: task.status,
      isCompleted: task.isCompleted,
      assigneeIds: task.assigneeIds.map((id) => id as string),
      comments: task.comments.map((comment) => ({
        commentId: comment.id,
        authorId: comment.authorId,
        body: comment.body.value,
        createdOnUtc: comment.createdOnUtc,
      })),
    };
  },
} as const;

/* =============================== Crear tarea ============================== */

export interface CreateSprintTaskCommand {
  requestContext: RequestContext;
  userStoryId: string;
  title: string;
  description: string;
  assigneeIds: ReadonlyArray<string>;
}

export class CreateSprintTaskHandler
  implements CommandHandler<CreateSprintTaskCommand, TaskDetailDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: CreateSprintTaskCommand): Promise<TaskDetailDto> {
    const story = await this.userStoryRepository.getById(
      UserStoryId.from(command.userStoryId),
    );
    if (story === null) {
      throw new ApplicationError("La historia de usuario no existe.");
    }

    const project = await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      story.projectId,
      PermissionAction.CreateTask,
    );

    const assigneeIds = command.assigneeIds.map((id) => UserId.from(id));
    if (assigneeIds.length > 0) {
      const existingUsers = await this.userRepository.getByIds(assigneeIds);
      const existingIds = new Set(existingUsers.map((item) => item.id));
      for (const assigneeId of assigneeIds) {
        if (!existingIds.has(assigneeId)) {
          throw new ApplicationError(
            `El usuario asignado ${assigneeId} no existe.`,
          );
        }
        if (!project.hasMember(assigneeId)) {
          throw new ApplicationError(
            `El usuario asignado ${assigneeId} no pertenece al proyecto.`,
          );
        }
      }
    }

    const task = SprintTaskAggregate.create(
      project.id,
      story.id,
      WorkItemName.create(command.title, "tarea"),
      Description.create(command.description),
      this.clock.utcNow,
    );

    for (const assigneeId of assigneeIds) {
      task.assignUser(assigneeId, this.clock.utcNow);
    }

    await this.sprintTaskRepository.add(task);
    await this.unitOfWork.saveChanges();

    return TaskMappings.toDetailDto(task);
  }
}

/* ====================== Listar tareas por proyecto ======================== */

export interface ListTasksByProjectQuery {
  requestContext: RequestContext;
  projectId: string;
}

export class ListTasksByProjectHandler
  implements
    QueryHandler<ListTasksByProjectQuery, ReadonlyArray<TaskSummaryDto>>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
  ) {}

  async handle(
    query: ListTasksByProjectQuery,
  ): Promise<ReadonlyArray<TaskSummaryDto>> {
    const project = await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      query.requestContext,
      ProjectId.from(query.projectId),
    );
    const tasks = await this.sprintTaskRepository.listByProject(project.id);
    return tasks.map(TaskMappings.toSummaryDto);
  }
}

/* ===================== Listar tareas por historia ========================= */

export interface ListTasksByUserStoryQuery {
  requestContext: RequestContext;
  userStoryId: string;
}

export class ListTasksByUserStoryHandler
  implements
    QueryHandler<ListTasksByUserStoryQuery, ReadonlyArray<TaskSummaryDto>>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
  ) {}

  async handle(
    query: ListTasksByUserStoryQuery,
  ): Promise<ReadonlyArray<TaskSummaryDto>> {
    const story = await this.userStoryRepository.getById(
      UserStoryId.from(query.userStoryId),
    );
    // Nota: la version original en C# lanzaba `ApplicationException` aqui en
    // lugar de `ApplicationLayerException`. Se preserva la intencion (es un
    // error de aplicacion) y se normaliza al tipo `ApplicationError` que
    // utiliza el resto de la capa.
    if (story === null) {
      throw new ApplicationError("La historia de usuario no existe.");
    }
    await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      query.requestContext,
      story.projectId,
    );
    const tasks = await this.sprintTaskRepository.listByUserStory(story.id);
    return tasks.map(TaskMappings.toSummaryDto);
  }
}

/* ====================== Listar tareas personales ========================== */

export interface ListPersonalTasksQuery {
  requestContext: RequestContext;
}

export class ListPersonalTasksHandler
  implements QueryHandler<ListPersonalTasksQuery, ReadonlyArray<TaskSummaryDto>>
{
  constructor(private readonly sprintTaskRepository: SprintTaskRepository) {}

  async handle(
    query: ListPersonalTasksQuery,
  ): Promise<ReadonlyArray<TaskSummaryDto>> {
    if (
      !VisibilityPolicy.canViewPersonalWorkload(
        query.requestContext.systemRole,
        query.requestContext.userId,
        query.requestContext.userId,
      )
    ) {
      throw new ApplicationError("No puede consultar su carga personal.");
    }
    const tasks = await this.sprintTaskRepository.listByAssignee(
      query.requestContext.userId,
    );
    return tasks.map(TaskMappings.toSummaryDto);
  }
}

/* ============================= Detalle de tarea =========================== */

export interface GetSprintTaskDetailQuery {
  requestContext: RequestContext;
  sprintTaskId: string;
}

export class GetSprintTaskDetailHandler
  implements QueryHandler<GetSprintTaskDetailQuery, TaskDetailDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
  ) {}

  async handle(query: GetSprintTaskDetailQuery): Promise<TaskDetailDto> {
    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(query.sprintTaskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }
    await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      query.requestContext,
      task.projectId,
    );
    return TaskMappings.toDetailDto(task);
  }
}

/* ======================== Cambiar estado de tarea ========================= */

export interface UpdateTaskStatusCommand {
  requestContext: RequestContext;
  sprintTaskId: string;
  status: string;
}

export class UpdateTaskStatusHandler
  implements CommandHandler<UpdateTaskStatusCommand, TaskDetailDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: UpdateTaskStatusCommand): Promise<TaskDetailDto> {
    const { status } = command;
    if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
      throw new ApplicationError(`Estado de tarea invalido: ${status}.`);
    }

    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(command.sprintTaskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }

    await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      command.requestContext,
      task.projectId,
    );

    task.updateStatus(status as TaskStatus, this.clock.utcNow);
    await this.unitOfWork.saveChanges();

    return TaskMappings.toDetailDto(task);
  }
}

/* ====================== Agregar comentario a tarea ======================== */

export interface AddTaskCommentCommand {
  requestContext: RequestContext;
  sprintTaskId: string;
  body: string;
}

export class AddTaskCommentHandler
  implements CommandHandler<AddTaskCommentCommand, TaskCommentDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: AddTaskCommentCommand): Promise<TaskCommentDto> {
    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(command.sprintTaskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }
    const project = await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      command.requestContext,
      task.projectId,
    );
    if (
      !project.hasMember(command.requestContext.userId) &&
      command.requestContext.systemRole !== SystemRole.Administrator
    ) {
      throw new ApplicationError(
        "No puede comentar una tarea fuera de su proyecto.",
      );
    }

    const comment = task.addComment(
      command.requestContext.userId,
      CommentBody.create(command.body),
      this.clock.utcNow,
    );
    await this.unitOfWork.saveChanges();
    return {
      commentId: comment.id,
      authorId: comment.authorId,
      body: comment.body.value,
      createdOnUtc: comment.createdOnUtc,
    };
  }
}

/* ===================== MCP: Detalle de tarea ======================== */

export interface McpGetSprintTaskDetailQuery {
  readonly projectId: string;
  readonly sprintTaskId: string;
}

export class McpGetSprintTaskDetailHandler
  implements QueryHandler<McpGetSprintTaskDetailQuery, TaskDetailDto>
{
  constructor(
    private readonly sprintTaskRepository: SprintTaskRepository,
  ) {}

  async handle(query: McpGetSprintTaskDetailQuery): Promise<TaskDetailDto> {
    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(query.sprintTaskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }
    if (task.projectId !== query.projectId) {
      throw new ApplicationError("La tarea no pertenece a este proyecto.");
    }
    return TaskMappings.toDetailDto(task);
  }
}

/* ===================== MCP: Cambiar estado de tarea =================== */

export interface McpUpdateTaskStatusCommand {
  readonly projectId: string;
  readonly sprintTaskId: string;
  readonly status: string;
}

export interface McpUpdateTaskStatusResult {
  readonly taskDetail: TaskDetailDto;
  readonly previousStatus: string;
}

export class McpUpdateTaskStatusHandler
  implements CommandHandler<McpUpdateTaskStatusCommand, McpUpdateTaskStatusResult>
{
  constructor(
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: McpUpdateTaskStatusCommand): Promise<McpUpdateTaskStatusResult> {
    const { status } = command;
    if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
      throw new ApplicationError(`Estado de tarea invalido: ${status}.`);
    }

    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(command.sprintTaskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }
    if (task.projectId !== command.projectId) {
      throw new ApplicationError("La tarea no pertenece a este proyecto.");
    }

    const previousStatus = task.status;
    task.updateStatus(status as TaskStatus, this.clock.utcNow);
    await this.unitOfWork.saveChanges();

    return {
      taskDetail: TaskMappings.toDetailDto(task),
      previousStatus,
    };
  }
}

/* ===================== MCP: Cambiar estado de tareas en bloque ========= */

export interface McpBulkUpdateTaskItemCommand {
  readonly taskId: string;
  readonly status: string;
}

export interface McpBulkUpdateTasksCommand {
  readonly projectId: string;
  readonly updates: ReadonlyArray<McpBulkUpdateTaskItemCommand>;
}

export interface McpBulkUpdateTaskSuccess {
  readonly taskId: string;
  readonly previousStatus: string;
  readonly newStatus: string;
}

export interface McpBulkUpdateTaskFailure {
  readonly taskId: string;
  readonly reason: string;
}

export interface McpBulkUpdateTasksResult {
  readonly updatedTasks: ReadonlyArray<McpBulkUpdateTaskSuccess>;
  readonly failedTasks: ReadonlyArray<McpBulkUpdateTaskFailure>;
  readonly summary: {
    readonly requested: number;
    readonly updated: number;
    readonly failed: number;
  };
}

export class McpBulkUpdateTasksHandler
  implements CommandHandler<McpBulkUpdateTasksCommand, McpBulkUpdateTasksResult>
{
  constructor(
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: McpBulkUpdateTasksCommand): Promise<McpBulkUpdateTasksResult> {
    const updatedTasks: McpBulkUpdateTaskSuccess[] = [];
    const failedTasks: McpBulkUpdateTaskFailure[] = [];

    for (const update of command.updates) {
      try {
        if (!Object.values(TaskStatus).includes(update.status as TaskStatus)) {
          throw new ApplicationError(`Estado de tarea invalido: ${update.status}.`);
        }

        const task = await this.sprintTaskRepository.getById(
          SprintTaskId.from(update.taskId),
        );
        if (task === null) {
          throw new ApplicationError("La tarea no existe.");
        }
        if (task.projectId !== command.projectId) {
          throw new ApplicationError("La tarea no pertenece a este proyecto.");
        }

        const previousStatus = task.status;
        task.updateStatus(update.status as TaskStatus, this.clock.utcNow);
        await this.unitOfWork.saveChanges();

        updatedTasks.push({
          taskId: update.taskId,
          previousStatus,
          newStatus: task.status,
        });
      } catch (error) {
        failedTasks.push({
          taskId: update.taskId,
          reason: error instanceof Error ? error.message : "Error desconocido.",
        });
      }
    }

    return {
      updatedTasks,
      failedTasks,
      summary: {
        requested: command.updates.length,
        updated: updatedTasks.length,
        failed: failedTasks.length,
      },
    };
  }
}

/* ===================== MCP: Agregar nota de agente ==================== */

export interface AddTaskAgentNoteCommand {
  readonly projectId: string;
  readonly taskId: string;
  readonly content: string;
}

export interface AddTaskAgentNoteResult {
  readonly noteId: string;
  readonly taskId: string;
  readonly content: string;
  readonly createdOnUtc: string;
}

export class AddTaskAgentNoteHandler
  implements CommandHandler<AddTaskAgentNoteCommand, AddTaskAgentNoteResult>
{
  private static readonly MAX_CONTENT_LENGTH = 10000;

  constructor(
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly taskAgentNoteRepository: TaskAgentNoteRepository,
  ) {}

  async handle(command: AddTaskAgentNoteCommand): Promise<AddTaskAgentNoteResult> {
    if (command.content.trim().length === 0) {
      throw new ApplicationError("El contenido de la nota no puede estar vacio.");
    }
    if (command.content.length > AddTaskAgentNoteHandler.MAX_CONTENT_LENGTH) {
      throw new ApplicationError(
        `El contenido de la nota no puede exceder los ${AddTaskAgentNoteHandler.MAX_CONTENT_LENGTH} caracteres.`,
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

    const noteId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.taskAgentNoteRepository.add({
      id: noteId,
      projectId: command.projectId,
      taskId: command.taskId,
      content: command.content,
      createdOnUtc: now,
    });

    return {
      noteId,
      taskId: command.taskId,
      content: command.content,
      createdOnUtc: now,
    };
  }
}
