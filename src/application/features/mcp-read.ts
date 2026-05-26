import { ProjectId } from "../../domain/ids/project-id";
import { SprintTaskId } from "../../domain/ids/sprint-task-id";
import { ProjectProgressCalculator } from "../../domain/services/project-progress-calculator";
import { ApplicationError } from "../abstractions/application-error";
import type { QueryHandler } from "../abstractions/messages";
import type {
  AuditEventRepository,
  ProjectRepository,
  SprintTaskRepository,
  TaskAgentNoteRepository,
  UserRepository,
  UserStoryRepository,
} from "../abstractions/ports";

/* ===================== get_project_detail =================== */

export interface GetProjectDetailQuery {
  readonly projectId: string;
}

export interface GetProjectDetailResult {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly externalReference: string;
  readonly progress: number;
  readonly counts: {
    readonly userStories: number;
    readonly tasks: number;
    readonly completedTasks: number;
    readonly members: number;
  };
  readonly createdOnUtc: string;
  readonly updatedOnUtc: string;
}

export class GetProjectDetailHandler
  implements QueryHandler<GetProjectDetailQuery, GetProjectDetailResult>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userStoryRepository: UserStoryRepository,
    private readonly sprintTaskRepository: SprintTaskRepository,
  ) {}

  async handle(query: GetProjectDetailQuery): Promise<GetProjectDetailResult> {
    const project = await this.projectRepository.getById(
      ProjectId.from(query.projectId),
    );
    if (project === null) {
      throw new ApplicationError("El proyecto no existe.");
    }

    const stories = await this.userStoryRepository.listByProject(project.id);
    const tasks = await this.sprintTaskRepository.listByProject(project.id);
    const progress = ProjectProgressCalculator.calculate(stories, tasks);

    return {
      id: project.id,
      name: project.name.value,
      description: project.description.value,
      externalReference: project.externalReference.value,
      progress,
      counts: {
        userStories: stories.length,
        tasks: tasks.length,
        completedTasks: tasks.filter((t) => t.isCompleted).length,
        members: project.members.length,
      },
      createdOnUtc: project.createdOnUtc.toISOString(),
      updatedOnUtc: project.updatedOnUtc.toISOString(),
    };
  }
}

/* ===================== list_project_members ================= */

export interface ListProjectMembersQuery {
  readonly projectId: string;
}

export interface ProjectMemberResult {
  readonly userId: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: string;
  readonly joinedOnUtc: string;
}

export class ListProjectMembersHandler
  implements QueryHandler<ListProjectMembersQuery, ReadonlyArray<ProjectMemberResult>>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async handle(query: ListProjectMembersQuery): Promise<ReadonlyArray<ProjectMemberResult>> {
    const project = await this.projectRepository.getById(
      ProjectId.from(query.projectId),
    );
    if (project === null) {
      throw new ApplicationError("El proyecto no existe.");
    }

    const memberIds = project.members.map((m) => m.id);
    const users = await this.userRepository.getByIds(memberIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return project.members.map((member) => {
      const user = userMap.get(member.id);
      return {
        userId: member.id,
        fullName: user?.fullName.value ?? "Usuario desconocido",
        email: user?.email.value ?? "",
        role: member.role,
        joinedOnUtc: member.joinedOnUtc.toISOString(),
      };
    });
  }
}

/* ===================== list_task_comments =================== */

export interface ListTaskCommentsQuery {
  readonly projectId: string;
  readonly taskId: string;
}

export interface TaskCommentResult {
  readonly id: string;
  readonly taskId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly body: string;
  readonly createdOnUtc: string;
}

export class ListTaskCommentsHandler
  implements QueryHandler<ListTaskCommentsQuery, ReadonlyArray<TaskCommentResult>>
{
  constructor(
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async handle(query: ListTaskCommentsQuery): Promise<ReadonlyArray<TaskCommentResult>> {
    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(query.taskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }
    if (task.projectId !== query.projectId) {
      throw new ApplicationError("La tarea no pertenece a este proyecto.");
    }

    const authorIds = task.comments.map((c) => c.authorId);
    const users = authorIds.length > 0
      ? await this.userRepository.getByIds(authorIds)
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName.value]));

    return task.comments.map((comment) => ({
      id: comment.id,
      taskId: query.taskId,
      authorId: comment.authorId,
      authorName: userMap.get(comment.authorId) ?? "Usuario desconocido",
      body: comment.body.value,
      createdOnUtc: comment.createdOnUtc.toISOString(),
    }));
  }
}

/* ===================== list_task_agent_notes ================ */

export interface ListTaskAgentNotesQuery {
  readonly projectId: string;
  readonly taskId: string;
}

export interface TaskAgentNoteResult {
  readonly id: string;
  readonly taskId: string;
  readonly content: string;
  readonly createdOnUtc: string;
}

export class ListTaskAgentNotesHandler
  implements QueryHandler<ListTaskAgentNotesQuery, ReadonlyArray<TaskAgentNoteResult>>
{
  constructor(
    private readonly sprintTaskRepository: SprintTaskRepository,
    private readonly taskAgentNoteRepository: TaskAgentNoteRepository,
  ) {}

  async handle(query: ListTaskAgentNotesQuery): Promise<ReadonlyArray<TaskAgentNoteResult>> {
    const task = await this.sprintTaskRepository.getById(
      SprintTaskId.from(query.taskId),
    );
    if (task === null) {
      throw new ApplicationError("La tarea no existe.");
    }
    if (task.projectId !== query.projectId) {
      throw new ApplicationError("La tarea no pertenece a este proyecto.");
    }

    const notes = await this.taskAgentNoteRepository.listByTask(
      query.taskId,
      query.projectId,
    );

    return notes.map((note) => ({
      id: note.id,
      taskId: note.taskId,
      content: note.content,
      createdOnUtc: note.createdOnUtc,
    }));
  }
}

/* ===================== get_project_activity ================= */

export interface GetProjectActivityQuery {
  readonly projectId: string;
  readonly limit: number;
}

export interface ProjectActivityEventResult {
  readonly id: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly occurredOnUtc: string;
}

export class GetProjectActivityHandler
  implements QueryHandler<GetProjectActivityQuery, ReadonlyArray<ProjectActivityEventResult>>
{
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 50;

  constructor(
    private readonly auditEventRepository: AuditEventRepository,
  ) {}

  async handle(query: GetProjectActivityQuery): Promise<ReadonlyArray<ProjectActivityEventResult>> {
    const limit = Math.min(
      Math.max(1, query.limit),
      GetProjectActivityHandler.MAX_LIMIT,
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
