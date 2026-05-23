import { PermissionAction } from "../../domain/enums/permission-action";
import { ProjectId } from "../../domain/ids/project-id";
import { SprintTaskId } from "../../domain/ids/sprint-task-id";
import { UserStoryId } from "../../domain/ids/user-story-id";
import { DeletionConfirmationPolicy } from "../../domain/services/deletion-confirmation-policy";
import { DeletionGuard } from "../../domain/services/deletion-guard";
import { ApplicationError } from "../abstractions/application-error";
import type { CommandHandler, Unit } from "../abstractions/messages";
import { Unit as UnitValue } from "../abstractions/messages";
import type {
  ProjectRepository,
  SprintTaskRepository,
  UnitOfWork,
  UserStoryRepository,
} from "../abstractions/ports";
import type { RequestContext } from "../abstractions/request-context";
import { ProjectAccess } from "./project-access";

/* ============================ Eliminar proyecto =========================== */

export interface DeleteProjectCommand {
  requestContext: RequestContext;
  projectId: string;
  confirmationName: string;
}

export class DeleteProjectHandler
  implements CommandHandler<DeleteProjectCommand, Unit>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async handle(command: DeleteProjectCommand): Promise<Unit> {
    const project = await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      ProjectId.from(command.projectId),
      PermissionAction.DeleteProject,
    );

    const stories = await this.userStoryRepository.listByProject(project.id);
    const tasks = await this.sprintTaskRepository.listByProject(project.id);

    DeletionGuard.ensureProjectCanBeDeleted(
      project.name.value,
      command.confirmationName,
      stories.length > 0,
      tasks.length > 0,
    );

    await this.projectRepository.delete(project);
    await this.unitOfWork.saveChanges();
    return UnitValue;
  }
}

/* ====================== Eliminar historia de usuario ====================== */

export interface DeleteUserStoryCommand {
  requestContext: RequestContext;
  userStoryId: string;
  confirmationName: string;
}

export class DeleteUserStoryHandler
  implements CommandHandler<DeleteUserStoryCommand, Unit>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async handle(command: DeleteUserStoryCommand): Promise<Unit> {
    const story = await this.userStoryRepository.getById(
      UserStoryId.from(command.userStoryId),
    );
    if (story === null) {
      throw new ApplicationError("La historia de usuario no existe.");
    }

    await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      story.projectId,
      PermissionAction.DeleteUserStory,
    );

    const tasks = await this.sprintTaskRepository.listByUserStory(story.id);
    DeletionGuard.ensureUserStoryCanBeDeleted(
      story.title.value,
      command.confirmationName,
      tasks.length > 0,
    );

    await this.userStoryRepository.delete(story);
    await this.unitOfWork.saveChanges();
    return UnitValue;
  }
}

/* ============================ Eliminar tarea ============================== */

export interface DeleteSprintTaskCommand {
  requestContext: RequestContext;
  sprintTaskId: string;
  confirmationName: string;
}

export class DeleteSprintTaskHandler
  implements CommandHandler<DeleteSprintTaskCommand, Unit>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async handle(command: DeleteSprintTaskCommand): Promise<Unit> {
    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(command.sprintTaskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }

    await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      task.projectId,
      PermissionAction.DeleteTask,
    );

    DeletionConfirmationPolicy.ensureConfirmation(
      task.title.value,
      command.confirmationName,
    );
    await this.sprintTaskRepository.delete(task);
    await this.unitOfWork.saveChanges();
    return UnitValue;
  }
}
