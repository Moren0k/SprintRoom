import { Project } from "../../domain/aggregates/project";
import { SprintTask } from "../../domain/aggregates/sprint-task";
import { UserStory } from "../../domain/aggregates/user-story";
import { ProjectId } from "../../domain/ids/project-id";
import { UserStoryId } from "../../domain/ids/user-story-id";
import { SprintTaskId } from "../../domain/ids/sprint-task-id";
import { Description } from "../../domain/value-objects/description";
import { ExternalReference } from "../../domain/value-objects/external-reference";
import { ProjectName } from "../../domain/value-objects/project-name";
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
import type { RequestContext } from "../abstractions/request-context";
import type { ProjectDetailDto } from "../models/application-dtos";

export interface PlannedUserStoryDto {
  title: string;
  description: string;
  tasks: ReadonlyArray<PlannedTaskDto>;
}

export interface PlannedTaskDto {
  title: string;
  description: string;
}

export interface PlanProjectFromIdeaCommand {
  requestContext: RequestContext;
  projectName: string;
  description: string;
  externalReference: string;
  userStories: ReadonlyArray<PlannedUserStoryDto>;
}

export class PlanProjectFromIdeaHandler
  implements CommandHandler<PlanProjectFromIdeaCommand, ProjectDetailDto>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: PlanProjectFromIdeaCommand): Promise<ProjectDetailDto> {
    if (command.userStories.length === 0) {
      throw new ApplicationError("El plan debe incluir al menos una historia de usuario.");
    }

    const project = Project.create(
      ProjectName.create(command.projectName),
      Description.create(command.description),
      ExternalReference.create(command.externalReference),
      command.requestContext.userId,
      this.clock.utcNow,
    );

    await this.projectRepository.add(project);

    for (const storyInput of command.userStories) {
      if (storyInput.tasks.length === 0) {
        throw new ApplicationError(
          `La historia "${storyInput.title}" debe incluir al menos una tarea.`,
        );
      }

      const story = UserStory.create(
        project.id,
        WorkItemName.create(storyInput.title, "historia de usuario"),
        Description.create(storyInput.description),
        this.clock.utcNow,
      );

      await this.userStoryRepository.add(story);

      for (const taskInput of storyInput.tasks) {
        const task = SprintTask.create(
          project.id,
          story.id,
          WorkItemName.create(taskInput.title, "tarea"),
          Description.create(taskInput.description),
          this.clock.utcNow,
        );

        await this.sprintTaskRepository.add(task);
      }
    }

    await this.unitOfWork.saveChanges();

    const ownerUser = await this.userRepository.getById(command.requestContext.userId);

    return {
      projectId: project.id,
      name: project.name.value,
      description: project.description.value,
      externalReference: project.externalReference.value,
      progress: 0,
      members: [{
        userId: command.requestContext.userId,
        fullName: ownerUser?.fullName.value ?? "",
        email: ownerUser?.email.value ?? "",
        projectRole: project.members[0].role,
      }],
      userStoryCount: command.userStories.length,
      taskCount: command.userStories.reduce((sum, s) => sum + s.tasks.length, 0),
    };
  }
}
