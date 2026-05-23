import type {
  ProjectRepository,
  SprintTaskRepository,
  UserRepository,
  UserStoryRepository,
} from "../../application/abstractions/ports";
import type { Project } from "../../domain/aggregates/project";
import type { SprintTask } from "../../domain/aggregates/sprint-task";
import type { User } from "../../domain/aggregates/user";
import type { UserStory } from "../../domain/aggregates/user-story";
import type { ProjectId } from "../../domain/ids/project-id";
import type { SprintTaskId } from "../../domain/ids/sprint-task-id";
import type { UserId } from "../../domain/ids/user-id";
import type { UserStoryId } from "../../domain/ids/user-story-id";
import type { InsForgeDatabaseGateway } from "./database-gateway";
import {
  projectFromRows,
  sprintTaskFromRows,
  userFromRow,
  userStoryFromRow,
} from "./mappers";
import type {
  ProjectMemberRow,
  ProjectRow,
  SprintTaskAssignmentRow,
  SprintTaskRow,
  TaskCommentRow,
  UserRow,
  UserStoryRow,
} from "./schema";
import { InsForgeUnitOfWork } from "./unit-of-work";
import type { InsForgeUnitOfWorkOptions } from "./unit-of-work";

export class InsForgeUserRepository implements UserRepository {
  constructor(
    private readonly database: InsForgeDatabaseGateway,
    private readonly unitOfWork: InsForgeUnitOfWork,
  ) {}

  async add(user: User): Promise<void> {
    this.unitOfWork.addUser(user);
  }

  async getById(userId: UserId): Promise<User | null> {
    const row = await this.database.selectOne<UserRow>("users", [
      { operator: "eq", column: "id", value: userId },
    ]);
    if (row === null) return null;
    const user = userFromRow(row);
    this.unitOfWork.trackUser(user);
    return user;
  }

  async getByEmail(normalizedEmail: string): Promise<User | null> {
    const row = await this.database.selectOne<UserRow>("users", [
      { operator: "eq", column: "email", value: normalizedEmail },
    ]);
    if (row === null) return null;
    const user = userFromRow(row);
    this.unitOfWork.trackUser(user);
    return user;
  }

  async getByIds(userIds: ReadonlyArray<UserId>): Promise<ReadonlyArray<User>> {
    if (userIds.length === 0) return [];
    const rows = await this.database.selectRows<UserRow>("users", {
      filters: [{ operator: "in", column: "id", value: userIds }],
    });
    const users = rows.map(userFromRow);
    for (const user of users) {
      this.unitOfWork.trackUser(user);
    }
    return users;
  }
}

export class InsForgeProjectRepository implements ProjectRepository {
  constructor(
    private readonly database: InsForgeDatabaseGateway,
    private readonly unitOfWork: InsForgeUnitOfWork,
  ) {}

  async add(project: Project): Promise<void> {
    this.unitOfWork.addProject(project);
  }

  async getById(projectId: ProjectId): Promise<Project | null> {
    const row = await this.database.selectOne<ProjectRow>("projects", [
      { operator: "eq", column: "id", value: projectId },
    ]);
    if (row === null) return null;
    const project = projectFromRows(row, await this.getMembers([projectId]));
    this.unitOfWork.trackProject(project);
    return project;
  }

  async list(): Promise<ReadonlyArray<Project>> {
    const rows = await this.database.selectRows<ProjectRow>("projects", {
      orderBy: { column: "created_on_utc", ascending: false },
    });
    const memberRows = await this.getMembers(rows.map((row) => row.id));
    const projects = rows.map((row) =>
      projectFromRows(
        row,
        memberRows.filter((member) => member.project_id === row.id),
      ),
    );
    for (const project of projects) {
      this.unitOfWork.trackProject(project);
    }
    return projects;
  }

  async delete(project: Project): Promise<void> {
    this.unitOfWork.deleteProject(project);
  }

  private async getMembers(projectIds: ReadonlyArray<string>): Promise<ProjectMemberRow[]> {
    if (projectIds.length === 0) return [];
    return this.database.selectRows<ProjectMemberRow>("project_members", {
      filters: [{ operator: "in", column: "project_id", value: projectIds }],
      orderBy: { column: "joined_on_utc", ascending: true },
    });
  }
}

export class InsForgeUserStoryRepository implements UserStoryRepository {
  constructor(
    private readonly database: InsForgeDatabaseGateway,
    private readonly unitOfWork: InsForgeUnitOfWork,
  ) {}

  async add(userStory: UserStory): Promise<void> {
    this.unitOfWork.addUserStory(userStory);
  }

  async getById(userStoryId: UserStoryId): Promise<UserStory | null> {
    const row = await this.database.selectOne<UserStoryRow>("user_stories", [
      { operator: "eq", column: "id", value: userStoryId },
    ]);
    if (row === null) return null;
    const userStory = userStoryFromRow(row);
    this.unitOfWork.trackUserStory(userStory);
    return userStory;
  }

  async listByProject(projectId: ProjectId): Promise<ReadonlyArray<UserStory>> {
    const rows = await this.database.selectRows<UserStoryRow>("user_stories", {
      filters: [{ operator: "eq", column: "project_id", value: projectId }],
      orderBy: { column: "created_on_utc", ascending: true },
    });
    const stories = rows.map(userStoryFromRow);
    for (const story of stories) {
      this.unitOfWork.trackUserStory(story);
    }
    return stories;
  }

  async delete(userStory: UserStory): Promise<void> {
    this.unitOfWork.deleteUserStory(userStory);
  }
}

export class InsForgeSprintTaskRepository implements SprintTaskRepository {
  constructor(
    private readonly database: InsForgeDatabaseGateway,
    private readonly unitOfWork: InsForgeUnitOfWork,
  ) {}

  async add(sprintTask: SprintTask): Promise<void> {
    this.unitOfWork.addSprintTask(sprintTask);
  }

  async getById(sprintTaskId: SprintTaskId): Promise<SprintTask | null> {
    const row = await this.database.selectOne<SprintTaskRow>("sprint_tasks", [
      { operator: "eq", column: "id", value: sprintTaskId },
    ]);
    if (row === null) return null;
    const tasks = await this.hydrateTasks([row]);
    return tasks[0] ?? null;
  }

  async listByProject(projectId: ProjectId): Promise<ReadonlyArray<SprintTask>> {
    const rows = await this.database.selectRows<SprintTaskRow>("sprint_tasks", {
      filters: [{ operator: "eq", column: "project_id", value: projectId }],
      orderBy: { column: "created_on_utc", ascending: true },
    });
    return this.hydrateTasks(rows);
  }

  async listByUserStory(userStoryId: UserStoryId): Promise<ReadonlyArray<SprintTask>> {
    const rows = await this.database.selectRows<SprintTaskRow>("sprint_tasks", {
      filters: [{ operator: "eq", column: "user_story_id", value: userStoryId }],
      orderBy: { column: "created_on_utc", ascending: true },
    });
    return this.hydrateTasks(rows);
  }

  async listByAssignee(userId: UserId): Promise<ReadonlyArray<SprintTask>> {
    const assignments = await this.database.selectRows<SprintTaskAssignmentRow>(
      "sprint_task_assignments",
      { filters: [{ operator: "eq", column: "user_id", value: userId }] },
    );
    const taskIds = assignments.map((assignment) => assignment.task_id);
    if (taskIds.length === 0) return [];
    const rows = await this.database.selectRows<SprintTaskRow>("sprint_tasks", {
      filters: [{ operator: "in", column: "id", value: taskIds }],
      orderBy: { column: "created_on_utc", ascending: true },
    });
    return this.hydrateTasks(rows);
  }

  async delete(sprintTask: SprintTask): Promise<void> {
    this.unitOfWork.deleteSprintTask(sprintTask);
  }

  private async hydrateTasks(rows: ReadonlyArray<SprintTaskRow>): Promise<SprintTask[]> {
    if (rows.length === 0) return [];
    const taskIds = rows.map((row) => row.id);
    const [assignments, comments] = await Promise.all([
      this.database.selectRows<SprintTaskAssignmentRow>("sprint_task_assignments", {
        filters: [{ operator: "in", column: "task_id", value: taskIds }],
      }),
      this.database.selectRows<TaskCommentRow>("task_comments", {
        filters: [{ operator: "in", column: "task_id", value: taskIds }],
        orderBy: { column: "created_on_utc", ascending: true },
      }),
    ]);
    const tasks = rows.map((row) =>
      sprintTaskFromRows(
        row,
        assignments.filter((assignment) => assignment.task_id === row.id),
        comments.filter((comment) => comment.task_id === row.id),
      ),
    );
    for (const task of tasks) {
      this.unitOfWork.trackSprintTask(task);
    }
    return tasks;
  }
}

export interface InsForgeRepositoryScope {
  readonly unitOfWork: InsForgeUnitOfWork;
  readonly users: InsForgeUserRepository;
  readonly projects: InsForgeProjectRepository;
  readonly userStories: InsForgeUserStoryRepository;
  readonly sprintTasks: InsForgeSprintTaskRepository;
}

export function createInsForgeRepositoryScope(
  database: InsForgeDatabaseGateway,
  options: InsForgeUnitOfWorkOptions = {},
): InsForgeRepositoryScope {
  const unitOfWork = new InsForgeUnitOfWork(database, options);
  return {
    unitOfWork,
    users: new InsForgeUserRepository(database, unitOfWork),
    projects: new InsForgeProjectRepository(database, unitOfWork),
    userStories: new InsForgeUserStoryRepository(database, unitOfWork),
    sprintTasks: new InsForgeSprintTaskRepository(database, unitOfWork),
  };
}
