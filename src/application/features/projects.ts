import { Project } from "../../domain/aggregates/project";
import { PermissionAction } from "../../domain/enums/permission-action";
import type { ProjectRole } from "../../domain/enums/project-role";
import { ProjectId } from "../../domain/ids/project-id";
import { UserId } from "../../domain/ids/user-id";
import { AuthorizationPolicy } from "../../domain/policies/authorization-policy";
import { VisibilityPolicy } from "../../domain/policies/visibility-policy";
import { ProjectProgressCalculator } from "../../domain/services/project-progress-calculator";
import { Description } from "../../domain/value-objects/description";
import { ExternalReference } from "../../domain/value-objects/external-reference";
import { ProjectName } from "../../domain/value-objects/project-name";
import { ApplicationError } from "../abstractions/application-error";
import type {
  CommandHandler,
  QueryHandler,
} from "../abstractions/messages";
import type {
  AuditEventRepository,
  Clock,
  ProjectRepository,
  SprintTaskRepository,
  UnitOfWork,
  UserRepository,
  UserStoryRepository,
} from "../abstractions/ports";
import type { RequestContext } from "../abstractions/request-context";
import type {
  ProjectDetailDto,
  ProjectMemberDto,
  ProjectSummaryDto,
} from "../models/application-dtos";
import { ProjectAccess } from "./project-access";

export interface InitialProjectMember {
  userId: string;
  projectRole: ProjectRole;
}

/* ======================== Construccion de detalle ======================== */

export async function buildProjectDetail(
  project: Project,
  userRepository: UserRepository,
  userStoryRepository: UserStoryRepository,
  sprintTaskRepository: SprintTaskRepository,
): Promise<ProjectDetailDto> {
  const stories = await userStoryRepository.listByProject(project.id);
  const tasks = await sprintTaskRepository.listByProject(project.id);
  const memberIds = project.members.map((member) => member.id);
  const users = await userRepository.getByIds(memberIds);

  const members: ProjectMemberDto[] = [];
  for (const member of project.members) {
    const user = users.find((item) => item.id === member.id);
    if (user === undefined) {
      continue;
    }
    members.push({
      userId: user.id,
      fullName: user.fullName.value,
      email: user.email.value,
      projectRole: member.role,
    });
  }

  return {
    projectId: project.id,
    name: project.name.value,
    description: project.description.value,
    externalReference: project.externalReference.value,
    progress: ProjectProgressCalculator.calculate(stories, tasks),
    members,
    userStoryCount: stories.length,
    taskCount: tasks.length,
  };
}

/* ============================ Crear proyecto ============================= */

export interface CreateProjectCommand {
  requestContext: RequestContext;
  name: string;
  description: string;
  externalReference: string;
  initialMembers: ReadonlyArray<InitialProjectMember>;
}

export class CreateProjectHandler
  implements CommandHandler<CreateProjectCommand, ProjectDetailDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: CreateProjectCommand): Promise<ProjectDetailDto> {
    if (!AuthorizationPolicy.canCreateProject(command.requestContext.systemRole)) {
      throw new ApplicationError("El usuario actual no puede crear proyectos.");
    }

    const project = Project.create(
      ProjectName.create(command.name),
      Description.create(command.description),
      ExternalReference.create(command.externalReference),
      command.requestContext.userId,
      this.clock.utcNow,
    );

    if (command.initialMembers.length > 0) {
      const memberIds = command.initialMembers.map((item) => UserId.from(item.userId));
      const existingUsers = await this.userRepository.getByIds(memberIds);
      const existingUserIds = new Set(existingUsers.map((item) => item.id));

      for (const member of command.initialMembers) {
        const userId = UserId.from(member.userId);
        if (!existingUserIds.has(userId)) {
          throw new ApplicationError(`El usuario ${member.userId} no existe.`);
        }
        if (userId === command.requestContext.userId) {
          continue;
        }
        project.addMember(userId, member.projectRole, this.clock.utcNow);
      }
    }

    await this.projectRepository.add(project);
    await this.unitOfWork.saveChanges();

    const users = await this.userRepository.getByIds(
      project.members.map((member) => member.id),
    );
    const members: ProjectMemberDto[] = [];
    for (const member of project.members) {
      const user = users.find((item) => item.id === member.id);
      if (user === undefined) continue;
      members.push({
        userId: user.id,
        fullName: user.fullName.value,
        email: user.email.value,
        projectRole: member.role,
      });
    }

    return {
      projectId: project.id,
      name: project.name.value,
      description: project.description.value,
      externalReference: project.externalReference.value,
      progress: 0,
      members,
      userStoryCount: 0,
      taskCount: 0,
    };
  }
}

/* ============================ Listar proyectos =========================== */

export interface ListProjectsQuery {
  requestContext: RequestContext;
}

export class ListProjectsHandler
  implements QueryHandler<ListProjectsQuery, ReadonlyArray<ProjectSummaryDto>>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
  ) {}

  async handle(query: ListProjectsQuery): Promise<ReadonlyArray<ProjectSummaryDto>> {
    const projects = await this.projectRepository.list();
    const result: ProjectSummaryDto[] = [];

    for (const project of projects) {
      const canView = VisibilityPolicy.canViewProjectDetails(
        query.requestContext.systemRole,
        project.hasMember(query.requestContext.userId),
      );
      if (!canView) {
        continue;
      }
      const stories = await this.userStoryRepository.listByProject(project.id);
      const tasks = await this.sprintTaskRepository.listByProject(project.id);
      const progress = ProjectProgressCalculator.calculate(stories, tasks);

      result.push({
        projectId: project.id,
        name: project.name.value,
        description: project.description.value,
        externalReference: project.externalReference.value,
        ownerId: project.ownerId,
        isOwnedByCurrentUser: project.ownerId === query.requestContext.userId,
        memberCount: project.members.length,
        userStoryCount: stories.length,
        taskCount: tasks.length,
        progress,
      });
    }
    return result;
  }
}

/* ==================== Actualizar documentacion del proyecto =============== */

export interface UpdateProjectDocumentationCommand {
  requestContext: RequestContext;
  projectId: string;
  name: string;
  description: string;
  externalReference: string;
}

export class UpdateProjectDocumentationHandler
  implements
    CommandHandler<UpdateProjectDocumentationCommand, ProjectDetailDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: UpdateProjectDocumentationCommand): Promise<ProjectDetailDto> {
    const project = await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      ProjectId.from(command.projectId),
      PermissionAction.EditProjectDocumentation,
    );

    project.updateDocumentation(
      ProjectName.create(command.name),
      Description.create(command.description),
      ExternalReference.create(command.externalReference),
      this.clock.utcNow,
    );

    await this.unitOfWork.saveChanges();

    return buildProjectDetail(
      project,
      this.userRepository,
      this.userStoryRepository,
      this.sprintTaskRepository,
    );
  }
}

/* ============================ Detalle de proyecto ========================= */

export interface GetProjectDetailQuery {
  requestContext: RequestContext;
  projectId: string;
}

export class GetProjectDetailHandler
  implements QueryHandler<GetProjectDetailQuery, ProjectDetailDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
  ) {}

  async handle(query: GetProjectDetailQuery): Promise<ProjectDetailDto> {
    const project = await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      query.requestContext,
      ProjectId.from(query.projectId),
    );
    return buildProjectDetail(
      project,
      this.userRepository,
      this.userStoryRepository,
      this.sprintTaskRepository,
    );
  }
}

/* ===================== Project Activity ====================== */

export interface ListProjectActivityQuery {
  readonly requestContext: RequestContext;
  readonly projectId: string;
  readonly limit?: number;
}

export interface ProjectActivityEvent {
  readonly id: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly occurredOnUtc: string;
}

export class ListProjectActivityHandler
  implements QueryHandler<ListProjectActivityQuery, ReadonlyArray<ProjectActivityEvent>>
{
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 50;

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly auditEventRepository: AuditEventRepository,
  ) {}

  async handle(
    query: ListProjectActivityQuery,
  ): Promise<ReadonlyArray<ProjectActivityEvent>> {
    await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      query.requestContext,
      ProjectId.from(query.projectId),
    );

    const limit = Math.min(
      Math.max(1, query.limit ?? ListProjectActivityHandler.DEFAULT_LIMIT),
      ListProjectActivityHandler.MAX_LIMIT,
    );

    const events = await this.auditEventRepository.listRecentByProject(
      query.projectId,
      limit,
    );

    return events.map((event) => ({
      id: event.id,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      occurredOnUtc: event.occurredOnUtc,
    }));
  }
}
