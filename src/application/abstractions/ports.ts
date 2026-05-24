import type { Project } from "../../domain/aggregates/project";
import type { SprintTask } from "../../domain/aggregates/sprint-task";
import type { User } from "../../domain/aggregates/user";
import type { UserStory } from "../../domain/aggregates/user-story";
import type { ProjectId } from "../../domain/ids/project-id";
import type { SprintTaskId } from "../../domain/ids/sprint-task-id";
import type { UserId } from "../../domain/ids/user-id";
import type { UserStoryId } from "../../domain/ids/user-story-id";

/**
 * Puertos (contratos) que la capa de aplicacion necesita para coordinar la
 * persistencia y los servicios transversales. Las implementaciones reales
 * conectan estos contratos con InsForge o repositorios in-memory para tests.
 */

export interface UserRepository {
  add(user: User): Promise<void>;
  getById(userId: UserId): Promise<User | null>;
  getByEmail(normalizedEmail: string): Promise<User | null>;
  getByIds(userIds: ReadonlyArray<UserId>): Promise<ReadonlyArray<User>>;
}

export interface ProjectRepository {
  add(project: Project): Promise<void>;
  getById(projectId: ProjectId): Promise<Project | null>;
  list(): Promise<ReadonlyArray<Project>>;
  delete(project: Project): Promise<void>;
}

export interface UserStoryRepository {
  add(userStory: UserStory): Promise<void>;
  getById(userStoryId: UserStoryId): Promise<UserStory | null>;
  listByProject(projectId: ProjectId): Promise<ReadonlyArray<UserStory>>;
  delete(userStory: UserStory): Promise<void>;
}

export interface SprintTaskRepository {
  add(sprintTask: SprintTask): Promise<void>;
  getById(sprintTaskId: SprintTaskId): Promise<SprintTask | null>;
  listByProject(projectId: ProjectId): Promise<ReadonlyArray<SprintTask>>;
  listByUserStory(userStoryId: UserStoryId): Promise<ReadonlyArray<SprintTask>>;
  listByAssignee(userId: UserId): Promise<ReadonlyArray<SprintTask>>;
  delete(sprintTask: SprintTask): Promise<void>;
}

export interface PasswordHasher {
  hash(plainTextPassword: string): string;
  verify(plainTextPassword: string, passwordHash: string): boolean;
}

export interface UnitOfWork {
  saveChanges(): Promise<void>;
}

export interface Clock {
  readonly utcNow: Date;
}
