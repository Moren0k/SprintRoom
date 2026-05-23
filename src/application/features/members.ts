import { PermissionAction } from "../../domain/enums/permission-action";
import type { ProjectRole } from "../../domain/enums/project-role";
import { ProjectId } from "../../domain/ids/project-id";
import { UserId } from "../../domain/ids/user-id";
import { VisibilityPolicy } from "../../domain/policies/visibility-policy";
import { ApplicationError } from "../abstractions/application-error";
import type {
  CommandHandler,
  QueryHandler,
  Unit,
} from "../abstractions/messages";
import { Unit as UnitValue } from "../abstractions/messages";
import type {
  Clock,
  ProjectRepository,
  SprintTaskRepository,
  UnitOfWork,
  UserRepository,
  UserStoryRepository,
} from "../abstractions/ports";
import type { RequestContext } from "../abstractions/request-context";
import type {
  ProjectMemberDetailDto,
  ProjectMemberDto,
  TaskSummaryDto,
  UserStorySummaryDto,
} from "../models/application-dtos";
import { ProjectAccess } from "./project-access";
import { TaskMappings } from "./tasks";

/* ============================== Agregar miembro =========================== */

export interface AddProjectMemberCommand {
  requestContext: RequestContext;
  projectId: string;
  userId: string;
  projectRole: ProjectRole;
}

export class AddProjectMemberHandler
  implements CommandHandler<AddProjectMemberCommand, ProjectMemberDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: AddProjectMemberCommand): Promise<ProjectMemberDto> {
    const project = await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      ProjectId.from(command.projectId),
      PermissionAction.ManageMembers,
    );

    const user = await this.userRepository.getById(UserId.from(command.userId));
    if (user === null) {
      throw new ApplicationError("El usuario que se desea agregar no existe.");
    }

    project.addMember(user.id, command.projectRole, this.clock.utcNow);
    await this.unitOfWork.saveChanges();

    return {
      userId: user.id,
      fullName: user.fullName.value,
      email: user.email.value,
      projectRole: command.projectRole,
    };
  }
}

/* ============================== Retirar miembro =========================== */

export interface RemoveProjectMemberCommand {
  requestContext: RequestContext;
  projectId: string;
  userId: string;
}

export class RemoveProjectMemberHandler
  implements CommandHandler<RemoveProjectMemberCommand, Unit>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: RemoveProjectMemberCommand): Promise<Unit> {
    const project = await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      ProjectId.from(command.projectId),
      PermissionAction.ManageMembers,
    );

    project.removeMember(UserId.from(command.userId), this.clock.utcNow);
    await this.unitOfWork.saveChanges();
    return UnitValue;
  }
}

/* ========================= Detalle de miembro en proyecto ================= */

export interface GetProjectMemberDetailQuery {
  requestContext: RequestContext;
  projectId: string;
  userId: string;
}

export class GetProjectMemberDetailHandler
  implements QueryHandler<GetProjectMemberDetailQuery, ProjectMemberDetailDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
  ) {}

  async handle(query: GetProjectMemberDetailQuery): Promise<ProjectMemberDetailDto> {
    const project = await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      query.requestContext,
      ProjectId.from(query.projectId),
    );

    if (
      !VisibilityPolicy.canViewProjectDetails(
        query.requestContext.systemRole,
        project.hasMember(query.requestContext.userId),
      )
    ) {
      throw new ApplicationError("No puede consultar este miembro.");
    }

    const memberId = UserId.from(query.userId);
    const member = project.members.find((item) => item.id === memberId);
    if (member === undefined) {
      throw new ApplicationError(
        "El usuario consultado no pertenece al proyecto.",
      );
    }

    const user = await this.userRepository.getById(member.id);
    if (user === null) {
      throw new ApplicationError("El usuario consultado no existe.");
    }

    const stories = await this.userStoryRepository.listByProject(project.id);
    const tasks = await this.sprintTaskRepository.listByProject(project.id);
    const assignedTasks = tasks.filter((task) =>
      task.assigneeIds.includes(member.id),
    );
    const completed = assignedTasks.filter((task) => task.isCompleted).length;
    const pending = assignedTasks.length - completed;
    const rate =
      assignedTasks.length === 0 ? 0 : (completed * 100) / assignedTasks.length;

    const storyDtos: UserStorySummaryDto[] = stories.map((story) => ({
      userStoryId: story.id,
      title: story.title.value,
      description: story.description.value,
      progress: story.calculateProgress(tasks),
    }));

    const taskDtos: TaskSummaryDto[] = assignedTasks.map(TaskMappings.toSummaryDto);

    return {
      userId: user.id,
      fullName: user.fullName.value,
      email: user.email.value,
      projectRole: member.role,
      totalAssignedTasks: assignedTasks.length,
      completedAssignedTasks: completed,
      pendingAssignedTasks: pending,
      assignedTasksCompletionRate: rate,
      userStories: storyDtos,
      assignedTasks: taskDtos,
    };
  }
}
