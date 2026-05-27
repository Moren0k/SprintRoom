import { ApplicationError } from "../../application/abstractions/application-error";
import type { RequestContext } from "../../application/abstractions/request-context";
import { SystemRole } from "../../domain/enums/system-role";
import { getTaskStatusProgress, type TaskStatus } from "../../domain/enums/task-status";
import type { ProjectRole } from "../../domain/enums/project-role";
import type { InsForgeDatabaseGateway } from "../insforge/database-gateway";
import type {
  ProjectMemberRow,
  ProjectRow,
  SprintTaskAssignmentRow,
  SprintTaskRow,
  TaskCommentRow,
  UserRow,
  UserStoryRow,
} from "../insforge/schema";
import { fromProjectRoleCode } from "../insforge/schema";

export interface DashboardProjectItemDto {
  readonly projectId: string;
  readonly name: string;
  readonly description: string;
  readonly externalReference: string;
  readonly ownerId: string;
  readonly isOwnedByCurrentUser: boolean;
  readonly currentUserProjectRole: ProjectRole | null;
  readonly memberCount: number;
  readonly userStoryCount: number;
  readonly taskCount: number;
  readonly progress: number;
}

export interface DashboardTaskItemDto {
  readonly sprintTaskId: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly userStoryId: string;
  readonly userStoryTitle: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly isCompleted: boolean;
  readonly assigneeIds: ReadonlyArray<string>;
  readonly commentCount: number;
}

export interface DashboardDto {
  readonly projects: ReadonlyArray<DashboardProjectItemDto>;
  readonly personalTasks: ReadonlyArray<DashboardTaskItemDto>;
  readonly totals: {
    readonly visibleProjectCount: number;
    readonly ownedProjectCount: number;
    readonly personalTaskCount: number;
    readonly completedPersonalTaskCount: number;
  };
}

export interface DashboardProjectMemberDetailDto {
  readonly userId: string;
  readonly fullName: string;
  readonly email: string;
  readonly projectRole: ProjectRole;
  readonly totalAssignedTasks: number;
  readonly completedAssignedTasks: number;
  readonly pendingAssignedTasks: number;
  readonly assignedTasksCompletionRate: number;
  readonly assignedTasks: ReadonlyArray<DashboardTaskItemDto>;
}

interface OperationalSnapshot {
  readonly projects: ReadonlyArray<ProjectRow>;
  readonly memberships: ReadonlyArray<ProjectMemberRow>;
  readonly stories: ReadonlyArray<UserStoryRow>;
  readonly tasks: ReadonlyArray<SprintTaskRow>;
  readonly assignments: ReadonlyArray<SprintTaskAssignmentRow>;
  readonly comments: ReadonlyArray<TaskCommentRow>;
}

export class InsForgeDashboardReadModel {
  constructor(
    private readonly database: InsForgeDatabaseGateway,
    private readonly userDatabase: InsForgeDatabaseGateway = database,
  ) {}

  async getDashboard(context: RequestContext): Promise<DashboardDto> {
    const snapshot = await this.loadSnapshot(context);
    const projects = snapshot.projects.map((project) =>
      this.toProjectItem(project, context, snapshot),
    );
    const personalTasks = this.toTaskItems(
      snapshot.tasks.filter((task) =>
        snapshot.assignments.some(
          (assignment) =>
            assignment.task_id === task.id && assignment.user_id === context.userId,
        ),
      ),
      snapshot,
    );
    return {
      projects,
      personalTasks,
      totals: {
        visibleProjectCount: projects.length,
        ownedProjectCount: projects.filter((project) => project.isOwnedByCurrentUser).length,
        personalTaskCount: personalTasks.length,
        completedPersonalTaskCount: personalTasks.filter((task) => task.isCompleted).length,
      },
    };
  }

  async listProjectSummaries(context: RequestContext): Promise<ReadonlyArray<DashboardProjectItemDto>> {
    const snapshot = await this.loadSnapshot(context);
    return snapshot.projects.map((project) => this.toProjectItem(project, context, snapshot));
  }

  async listPersonalTasks(context: RequestContext): Promise<ReadonlyArray<DashboardTaskItemDto>> {
    const snapshot = await this.loadSnapshot(context);
    return this.toTaskItems(
      snapshot.tasks.filter((task) =>
        snapshot.assignments.some(
          (assignment) =>
            assignment.task_id === task.id && assignment.user_id === context.userId,
        ),
      ),
      snapshot,
    );
  }

  async getProjectMemberDetail(
    context: RequestContext,
    projectId: string,
    userId: string,
  ): Promise<DashboardProjectMemberDetailDto> {
    const snapshot = await this.loadSnapshot(context);
    const project = snapshot.projects.find((item) => item.id === projectId);
    if (project === undefined) {
      throw new ApplicationError("El proyecto solicitado no existe o no es visible.");
    }
    const member = snapshot.memberships.find(
      (item) => item.project_id === projectId && item.user_id === userId,
    );
    if (member === undefined) {
      throw new ApplicationError("El usuario consultado no pertenece al proyecto.");
    }
    const user = await this.userDatabase.selectOne<UserRow>("users", [
      { operator: "eq", column: "id", value: userId },
    ]);
    if (user === null) {
      throw new ApplicationError("El usuario consultado no existe.");
    }
    const assignedTaskIds = new Set(
      snapshot.assignments
        .filter((assignment) => assignment.user_id === userId)
        .map((assignment) => assignment.task_id),
    );
    const assignedTasks = this.toTaskItems(
      snapshot.tasks.filter(
        (task) => task.project_id === projectId && assignedTaskIds.has(task.id),
      ),
      snapshot,
    );
    const completed = assignedTasks.filter((task) => task.isCompleted).length;
    return {
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      projectRole: fromProjectRoleCode(member.role),
      totalAssignedTasks: assignedTasks.length,
      completedAssignedTasks: completed,
      pendingAssignedTasks: assignedTasks.length - completed,
      assignedTasksCompletionRate:
        assignedTasks.length === 0 ? 0 : (completed * 100) / assignedTasks.length,
      assignedTasks,
    };
  }

  private async loadSnapshot(context: RequestContext): Promise<OperationalSnapshot> {
    const isAdmin = context.systemRole === SystemRole.Administrator;
    const visibleMemberships = isAdmin
      ? await this.database.selectRows<ProjectMemberRow>("project_members")
      : await this.database.selectRows<ProjectMemberRow>("project_members", {
          filters: [{ operator: "eq", column: "user_id", value: context.userId }],
        });
    const visibleProjectIds = isAdmin ? null : visibleMemberships.map((item) => item.project_id);
    const projects = await this.database.selectRows<ProjectRow>("projects", {
      filters:
        visibleProjectIds === null
          ? []
          : [{ operator: "in", column: "id", value: visibleProjectIds }],
      orderBy: { column: "created_on_utc", ascending: false },
    });
    const projectIds = projects.map((project) => project.id);
    const [memberships, stories, tasks] = await Promise.all([
      this.database.selectRows<ProjectMemberRow>("project_members", {
        filters: [{ operator: "in", column: "project_id", value: projectIds }],
      }),
      this.database.selectRows<UserStoryRow>("user_stories", {
        filters: [{ operator: "in", column: "project_id", value: projectIds }],
      }),
      this.database.selectRows<SprintTaskRow>("sprint_tasks", {
        filters: [{ operator: "in", column: "project_id", value: projectIds }],
      }),
    ]);
    const taskIds = tasks.map((task) => task.id);
    const [assignments, comments] = await Promise.all([
      this.database.selectRows<SprintTaskAssignmentRow>("sprint_task_assignments", {
        filters: [{ operator: "in", column: "task_id", value: taskIds }],
      }),
      this.database.selectRows<TaskCommentRow>("task_comments", {
        filters: [{ operator: "in", column: "task_id", value: taskIds }],
      }),
    ]);
    return { projects, memberships, stories, tasks, assignments, comments };
  }

  private toProjectItem(
    project: ProjectRow,
    context: RequestContext,
    snapshot: OperationalSnapshot,
  ): DashboardProjectItemDto {
    const projectStories = snapshot.stories.filter((story) => story.project_id === project.id);
    const projectTasks = snapshot.tasks.filter((task) => task.project_id === project.id);
    const currentMembership = snapshot.memberships.find(
      (membership) =>
        membership.project_id === project.id && membership.user_id === context.userId,
    );
    return {
      projectId: project.id,
      name: project.name,
      description: project.description,
      externalReference: project.external_reference,
      ownerId: project.owner_id,
      isOwnedByCurrentUser: project.owner_id === context.userId,
      currentUserProjectRole:
        currentMembership === undefined ? null : fromProjectRoleCode(currentMembership.role),
      memberCount: snapshot.memberships.filter((membership) => membership.project_id === project.id).length,
      userStoryCount: projectStories.length,
      taskCount: projectTasks.length,
      progress: calculateProjectProgress(projectStories, projectTasks),
    };
  }

  private toTaskItems(
    tasks: ReadonlyArray<SprintTaskRow>,
    snapshot: OperationalSnapshot,
  ): DashboardTaskItemDto[] {
    return tasks.map((task) => {
      const project = snapshot.projects.find((item) => item.id === task.project_id);
      const story = snapshot.stories.find((item) => item.id === task.user_story_id);
      return {
        sprintTaskId: task.id,
        projectId: task.project_id,
        projectName: project?.name ?? "",
        userStoryId: task.user_story_id,
        userStoryTitle: story?.title ?? "",
        title: task.title,
        description: task.description,
        isCompleted: task.is_completed,
        status: task.status,
        assigneeIds: snapshot.assignments
          .filter((assignment) => assignment.task_id === task.id)
          .map((assignment) => assignment.user_id),
        commentCount: snapshot.comments.filter((comment) => comment.task_id === task.id).length,
      };
    });
  }
}

function calculateProjectProgress(
  stories: ReadonlyArray<UserStoryRow>,
  tasks: ReadonlyArray<SprintTaskRow>,
): number {
  if (stories.length === 0 || tasks.length === 0) {
    return 0;
  }
  const storyIds = new Set(stories.map((story) => story.id));
  const projectTasks = tasks.filter((task) => storyIds.has(task.user_story_id));
  if (projectTasks.length === 0) {
    return 0;
  }
  const total = projectTasks.reduce(
    (sum, task) => sum + getTaskStatusProgress(task.status as TaskStatus),
    0,
  );
  return total / projectTasks.length;
}
