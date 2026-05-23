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
    // InsForge SDK/PostgREST calls are applied sequentially here. This unit of
    // work coordinates aggregate persistence but does not provide a database
    // transaction boundary; callers must treat multi-table failures as partial.
    await this.deleteRemovedSprintTasks();
    await this.deleteRemovedUserStories();
    await this.deleteRemovedProjects();
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
    for (const tracked of this.sprintTasks.values()) {
      if (tracked.state !== "deleted") continue;
      await this.retainTaskCommentsBeforeDeletion(tracked.entity);
      await this.database.deleteRows("sprint_tasks", [
        { operator: "eq", column: "id", value: tracked.entity.id },
      ]);
    }
  }

  private async retainTaskCommentsBeforeDeletion(task: SprintTask): Promise<void> {
    if (task.comments.length === 0) {
      return;
    }
    const retainedOnUtc = (this.options.utcNow?.() ?? new Date()).toISOString();
    const rows: RetainedTaskCommentRow[] = task.comments.map((comment) => ({
      comment_id: comment.id,
      task_id: task.id,
      author_id: comment.authorId,
      body: comment.body.value,
      created_on_utc: comment.createdOnUtc.toISOString(),
      retained_on_utc: retainedOnUtc,
      retained_by: this.options.actorId ?? null,
      reason: "task_deleted",
    }));
    await this.database.upsertRows("retained_task_comments", rows, {
      onConflict: "comment_id",
    });
  }

  private async deleteRemovedUserStories(): Promise<void> {
    for (const tracked of this.userStories.values()) {
      if (tracked.state !== "deleted") continue;
      await this.database.deleteRows("user_stories", [
        { operator: "eq", column: "id", value: tracked.entity.id },
      ]);
    }
  }

  private async deleteRemovedProjects(): Promise<void> {
    for (const tracked of this.projects.values()) {
      if (tracked.state !== "deleted") continue;
      await this.database.deleteRows("projects", [
        { operator: "eq", column: "id", value: tracked.entity.id },
      ]);
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
      await this.database.upsertRows("projects", [projectToRow(project)], {
        onConflict: "id",
      });
      await this.database.deleteRows("project_members", [
        { operator: "eq", column: "project_id", value: project.id },
      ]);
      await this.database.insertRows(
        "project_members",
        project.members.map((member) => projectMemberToRow(project.id, member)),
      );
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
      await this.database.upsertRows("sprint_tasks", [sprintTaskToRow(task)], {
        onConflict: "id",
      });
      await this.database.deleteRows("sprint_task_assignments", [
        { operator: "eq", column: "task_id", value: task.id },
      ]);
      await this.database.insertRows("sprint_task_assignments", sprintTaskAssignmentToRows(task));
      await this.database.upsertRows(
        "task_comments",
        task.comments.map((comment) => taskCommentToRow(task.id, comment)),
        { onConflict: "id" },
      );
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
