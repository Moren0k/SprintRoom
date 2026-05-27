import type { UnitOfWork } from "../../application/abstractions/ports";
import type { Project } from "../../domain/aggregates/project";
import type { SprintTask } from "../../domain/aggregates/sprint-task";
import type { User } from "../../domain/aggregates/user";
import type { UserStory } from "../../domain/aggregates/user-story";
import type { UserId } from "../../domain/ids/user-id";
import type { InsForgeDatabaseGateway } from "./database-gateway";
import {
  projectMemberToRow,
  projectToRow,
  sprintTaskAssignmentToRows,
  sprintTaskToRow,
  taskCommentToRow,
  userStoryToRow,
  userToRow,
} from "./mappers";
import type { RetainedTaskCommentRow } from "./schema";

const SAVE_PROJECT_BUNDLE_RPC = "save_project_bundle";
const SAVE_SPRINT_TASK_BUNDLE_RPC = "save_sprint_task_bundle";
const DELETE_SPRINT_TASK_BUNDLE_RPC = "delete_sprint_task_bundle";
const DELETE_USER_STORY_BUNDLE_RPC = "delete_user_story_bundle";
const DELETE_PROJECT_BUNDLE_RPC = "delete_project_bundle";

type TrackingState = "tracked" | "added" | "deleted";

interface Tracked<T> {
  readonly entity: T;
  state: TrackingState;
  readonly initialSnapshot: string | null;
}

export interface InsForgeUnitOfWorkOptions {
  readonly actorId?: UserId;
  readonly utcNow?: () => Date;
}

export class InsForgeUnitOfWork implements UnitOfWork {
  private readonly users = new Map<string, Tracked<User>>();
  private readonly projects = new Map<string, Tracked<Project>>();
  private readonly userStories = new Map<string, Tracked<UserStory>>();
  private readonly sprintTasks = new Map<string, Tracked<SprintTask>>();

  constructor(
    private readonly database: InsForgeDatabaseGateway,
    private readonly options: InsForgeUnitOfWorkOptions = {},
  ) {}

  trackUser(user: User): void {
    this.register(this.users, user.id, user, "tracked", snapshotUser(user));
  }

  addUser(user: User): void {
    this.register(this.users, user.id, user, "added", null);
  }

  trackProject(project: Project): void {
    this.register(this.projects, project.id, project, "tracked", snapshotProject(project));
  }

  addProject(project: Project): void {
    this.register(this.projects, project.id, project, "added", null);
  }

  deleteProject(project: Project): void {
    this.register(this.projects, project.id, project, "deleted", null);
  }

  trackUserStory(userStory: UserStory): void {
    this.register(this.userStories, userStory.id, userStory, "tracked", snapshotUserStory(userStory));
  }

  addUserStory(userStory: UserStory): void {
    this.register(this.userStories, userStory.id, userStory, "added", null);
  }

  deleteUserStory(userStory: UserStory): void {
    this.register(this.userStories, userStory.id, userStory, "deleted", null);
  }

  trackSprintTask(sprintTask: SprintTask): void {
    this.register(this.sprintTasks, sprintTask.id, sprintTask, "tracked", snapshotSprintTask(sprintTask));
  }

  addSprintTask(sprintTask: SprintTask): void {
    this.register(this.sprintTasks, sprintTask.id, sprintTask, "added", null);
  }

  deleteSprintTask(sprintTask: SprintTask): void {
    this.register(this.sprintTasks, sprintTask.id, sprintTask, "deleted", null);
  }

  async saveChanges(): Promise<void> {
    await this.deleteRemovedProjects();
    await this.deleteRemovedUserStories();
    await this.deleteRemovedSprintTasks();
    await this.saveUsers();
    await this.saveProjects();
    await this.saveUserStories();
    await this.saveSprintTasks();
    this.clear();
  }

  private register<T>(
    map: Map<string, Tracked<T>>,
    id: string,
    entity: T,
    state: TrackingState,
    initialSnapshot: string | null,
  ): void {
    const current = map.get(id);
    if (current === undefined) {
      map.set(id, { entity, state, initialSnapshot });
      return;
    }
    current.state = state === "deleted" ? "deleted" : current.state;
  }

  private async deleteRemovedSprintTasks(): Promise<void> {
    const deletedProjectIds = new Set(
      [...this.projects.values()]
        .filter((tracked) => tracked.state === "deleted")
        .map((tracked) => tracked.entity.id),
    );
    const deletedUserStoryIds = new Set(
      [...this.userStories.values()]
        .filter((tracked) => tracked.state === "deleted")
        .map((tracked) => tracked.entity.id),
    );

    for (const tracked of this.sprintTasks.values()) {
      if (tracked.state !== "deleted") continue;
      if (deletedProjectIds.has(tracked.entity.projectId) || deletedUserStoryIds.has(tracked.entity.userStoryId)) {
        continue;
      }
      await this.database.rpc<void>(DELETE_SPRINT_TASK_BUNDLE_RPC, {
        args: {
          p_task_id: tracked.entity.id,
          p_retained_comments: this.buildRetainedTaskCommentRows(tracked.entity),
        },
      });
    }
  }

  private buildRetainedTaskCommentRows(task: SprintTask): RetainedTaskCommentRow[] {
    if (task.comments.length === 0) {
      return [];
    }
    const retainedOnUtc = (this.options.utcNow?.() ?? new Date()).toISOString();
    return task.comments.map((comment) => ({
      comment_id: comment.id,
      task_id: task.id,
      author_id: comment.authorId,
      body: comment.body.value,
      created_on_utc: comment.createdOnUtc.toISOString(),
      retained_on_utc: retainedOnUtc,
      retained_by: this.options.actorId ?? null,
      reason: "task_deleted",
    }));
  }

  private async deleteRemovedUserStories(): Promise<void> {
    const deletedProjectIds = new Set(
      [...this.projects.values()]
        .filter((tracked) => tracked.state === "deleted")
        .map((tracked) => tracked.entity.id),
    );

    for (const tracked of this.userStories.values()) {
      if (tracked.state !== "deleted") continue;
      if (deletedProjectIds.has(tracked.entity.projectId)) {
        continue;
      }

      const retainedComments = [...this.sprintTasks.values()]
        .filter((taskTracked) =>
          taskTracked.state === "deleted" && taskTracked.entity.userStoryId === tracked.entity.id,
        )
        .flatMap((taskTracked) => this.buildRetainedTaskCommentRows(taskTracked.entity));

      await this.database.rpc<void>(DELETE_USER_STORY_BUNDLE_RPC, {
        args: {
          p_user_story_id: tracked.entity.id,
          p_retained_comments: retainedComments,
        },
      });
    }
  }

  private async deleteRemovedProjects(): Promise<void> {
    for (const tracked of this.projects.values()) {
      if (tracked.state !== "deleted") continue;

      const retainedComments = [...this.sprintTasks.values()]
        .filter((taskTracked) =>
          taskTracked.state === "deleted" && taskTracked.entity.projectId === tracked.entity.id,
        )
        .flatMap((taskTracked) => this.buildRetainedTaskCommentRows(taskTracked.entity));

      await this.database.rpc<void>(DELETE_PROJECT_BUNDLE_RPC, {
        args: {
          p_project_id: tracked.entity.id,
          p_retained_comments: retainedComments,
        },
      });
    }
  }

  private async saveUsers(): Promise<void> {
    const rows = [...this.users.values()]
      .filter((tracked) => tracked.state !== "deleted" && hasChanged(tracked, snapshotUser))
      .map((tracked) => userToRow(tracked.entity));
    await this.database.upsertRows("users", rows, { onConflict: "id" });
  }

  private async saveProjects(): Promise<void> {
    for (const tracked of this.projects.values()) {
      if (tracked.state === "deleted") continue;
      if (!hasChanged(tracked, snapshotProject)) continue;
      const project = tracked.entity;
      await this.database.rpc<void>(SAVE_PROJECT_BUNDLE_RPC, {
        args: {
          p_project: projectToRow(project),
          p_members: project.members.map((member) => projectMemberToRow(project.id, member)),
        },
      });
    }
  }

  private async saveUserStories(): Promise<void> {
    const rows = [...this.userStories.values()]
      .filter((tracked) => tracked.state !== "deleted" && hasChanged(tracked, snapshotUserStory))
      .map((tracked) => userStoryToRow(tracked.entity));
    await this.database.upsertRows("user_stories", rows, { onConflict: "id" });
  }

  private async saveSprintTasks(): Promise<void> {
    for (const tracked of this.sprintTasks.values()) {
      if (tracked.state === "deleted") continue;
      if (!hasChanged(tracked, snapshotSprintTask)) continue;
      const task = tracked.entity;
      await this.database.rpc<void>(SAVE_SPRINT_TASK_BUNDLE_RPC, {
        args: {
          p_task: sprintTaskToRow(task),
          p_assignments: sprintTaskAssignmentToRows(task),
          p_comments: task.comments.map((comment) => taskCommentToRow(task.id, comment)),
        },
      });
    }
  }

  private clear(): void {
    this.users.clear();
    this.projects.clear();
    this.userStories.clear();
    this.sprintTasks.clear();
  }
}

function hasChanged<T>(tracked: Tracked<T>, snapshot: (entity: T) => string): boolean {
  return tracked.state === "added" || tracked.initialSnapshot !== snapshot(tracked.entity);
}

function snapshotUser(user: User): string {
  return JSON.stringify(userToRow(user));
}

function snapshotProject(project: Project): string {
  return JSON.stringify({
    project: projectToRow(project),
    members: project.members.map((member) => projectMemberToRow(project.id, member)),
  });
}

function snapshotUserStory(userStory: UserStory): string {
  return JSON.stringify(userStoryToRow(userStory));
}

function snapshotSprintTask(task: SprintTask): string {
  return JSON.stringify({
    task: sprintTaskToRow(task),
    assignments: sprintTaskAssignmentToRows(task),
    comments: task.comments.map((comment) => taskCommentToRow(task.id, comment)),
  });
}
