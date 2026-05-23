import { UserStory } from "../../domain/aggregates/user-story";
import { PermissionAction } from "../../domain/enums/permission-action";
import { ProjectId } from "../../domain/ids/project-id";
import { UserStoryId } from "../../domain/ids/user-story-id";
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
  UnitOfWork,
  UserStoryRepository,
} from "../abstractions/ports";
import type { RequestContext } from "../abstractions/request-context";
import type {
  UserStoryDetailDto,
  UserStorySummaryDto,
} from "../models/application-dtos";
import { ProjectAccess } from "./project-access";

/* ========================= Crear historia de usuario ===================== */

export interface CreateUserStoryCommand {
  requestContext: RequestContext;
  projectId: string;
  title: string;
  description: string;
}

export class CreateUserStoryHandler
  implements CommandHandler<CreateUserStoryCommand, UserStoryDetailDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: CreateUserStoryCommand): Promise<UserStoryDetailDto> {
    const project = await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      ProjectId.from(command.projectId),
      PermissionAction.CreateUserStory,
    );

    const userStory = UserStory.create(
      project.id,
      WorkItemName.create(command.title, "historia de usuario"),
      Description.create(command.description),
      this.clock.utcNow,
    );

    await this.userStoryRepository.add(userStory);
    await this.unitOfWork.saveChanges();

    return {
      userStoryId: userStory.id,
      projectId: project.id,
      title: userStory.title.value,
      description: userStory.description.value,
      progress: 0,
      taskCount: 0,
    };
  }
}

/* ===================== Listar historias por proyecto ====================== */

export interface ListUserStoriesByProjectQuery {
  requestContext: RequestContext;
  projectId: string;
}

export class ListUserStoriesByProjectHandler
  implements
    QueryHandler<
      ListUserStoriesByProjectQuery,
      ReadonlyArray<UserStorySummaryDto>
    >
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
  ) {}

  async handle(
    query: ListUserStoriesByProjectQuery,
  ): Promise<ReadonlyArray<UserStorySummaryDto>> {
    const project = await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      query.requestContext,
      ProjectId.from(query.projectId),
    );

    const stories = await this.userStoryRepository.listByProject(project.id);
    const tasks = await this.sprintTaskRepository.listByProject(project.id);

    return stories.map((story) => ({
      userStoryId: story.id,
      title: story.title.value,
      description: story.description.value,
      progress: story.calculateProgress(tasks),
    }));
  }
}

/* ======================= Detalle de historia de usuario =================== */

export interface GetUserStoryDetailQuery {
  requestContext: RequestContext;
  userStoryId: string;
}

export class GetUserStoryDetailHandler
  implements QueryHandler<GetUserStoryDetailQuery, UserStoryDetailDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
  ) {}

  async handle(query: GetUserStoryDetailQuery): Promise<UserStoryDetailDto> {
    const story = await this.userStoryRepository.getById(
      UserStoryId.from(query.userStoryId),
    );
    if (story === null) {
      throw new ApplicationError("La historia de usuario no existe.");
    }
    await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      query.requestContext,
      story.projectId,
    );

    const tasks = await this.sprintTaskRepository.listByUserStory(story.id);

    return {
      userStoryId: story.id,
      projectId: story.projectId,
      title: story.title.value,
      description: story.description.value,
      progress: story.calculateProgress(tasks),
      taskCount: tasks.length,
    };
  }
}
