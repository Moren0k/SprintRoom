import type {
  AuditEventRecord,
  AuditEventRepository,
  Clock,
  KeyHasher,
  PasswordHasher,
  ProjectKeyRecord,
  ProjectKeyRepository,
  ProjectRepository,
  SprintTaskRepository,
  TaskAgentNoteRepository,
  UnitOfWork,
  UserRepository,
  UserStoryRepository,
} from "../../../src/application/abstractions/ports";
import type { Project } from "../../../src/domain/aggregates/project";
import type { SprintTask } from "../../../src/domain/aggregates/sprint-task";
import type { User } from "../../../src/domain/aggregates/user";
import type { UserStory } from "../../../src/domain/aggregates/user-story";
import type { ProjectId } from "../../../src/domain/ids/project-id";
import type { SprintTaskId } from "../../../src/domain/ids/sprint-task-id";
import type { UserId } from "../../../src/domain/ids/user-id";
import type { UserStoryId } from "../../../src/domain/ids/user-story-id";

export class InMemoryUserRepository implements UserRepository {
  private readonly users: User[] = [];

  async add(user: User): Promise<void> {
    this.users.push(user);
  }

  async getById(userId: UserId): Promise<User | null> {
    return this.users.find((item) => item.id === userId) ?? null;
  }

  async getByEmail(normalizedEmail: string): Promise<User | null> {
    return this.users.find((item) => item.email.value === normalizedEmail) ?? null;
  }

  async getByIds(userIds: ReadonlyArray<UserId>): Promise<ReadonlyArray<User>> {
    const set = new Set(userIds as ReadonlyArray<string>);
    return this.users.filter((item) => set.has(item.id));
  }
}

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects: Project[] = [];

  async add(project: Project): Promise<void> {
    this.projects.push(project);
  }

  async getById(projectId: ProjectId): Promise<Project | null> {
    return this.projects.find((item) => item.id === projectId) ?? null;
  }

  async list(): Promise<ReadonlyArray<Project>> {
    return this.projects.slice();
  }

  async delete(project: Project): Promise<void> {
    const idx = this.projects.indexOf(project);
    if (idx !== -1) this.projects.splice(idx, 1);
  }
}

export class InMemoryUserStoryRepository implements UserStoryRepository {
  private readonly stories: UserStory[] = [];

  async add(userStory: UserStory): Promise<void> {
    this.stories.push(userStory);
  }

  async getById(userStoryId: UserStoryId): Promise<UserStory | null> {
    return this.stories.find((item) => item.id === userStoryId) ?? null;
  }

  async listByProject(projectId: ProjectId): Promise<ReadonlyArray<UserStory>> {
    return this.stories.filter((item) => item.projectId === projectId);
  }

  async delete(userStory: UserStory): Promise<void> {
    const idx = this.stories.indexOf(userStory);
    if (idx !== -1) this.stories.splice(idx, 1);
  }
}

export class InMemorySprintTaskRepository implements SprintTaskRepository {
  private readonly tasks: SprintTask[] = [];

  async add(sprintTask: SprintTask): Promise<void> {
    this.tasks.push(sprintTask);
  }

  async getById(sprintTaskId: SprintTaskId): Promise<SprintTask | null> {
    return this.tasks.find((item) => item.id === sprintTaskId) ?? null;
  }

  async listByProject(projectId: ProjectId): Promise<ReadonlyArray<SprintTask>> {
    return this.tasks.filter((item) => item.projectId === projectId);
  }

  async listByUserStory(userStoryId: UserStoryId): Promise<ReadonlyArray<SprintTask>> {
    return this.tasks.filter((item) => item.userStoryId === userStoryId);
  }

  async listByAssignee(userId: UserId): Promise<ReadonlyArray<SprintTask>> {
    return this.tasks.filter((item) => item.assigneeIds.includes(userId));
  }

  async delete(sprintTask: SprintTask): Promise<void> {
    const idx = this.tasks.indexOf(sprintTask);
    if (idx !== -1) this.tasks.splice(idx, 1);
  }
}

export class InMemoryTaskAgentNoteRepository implements TaskAgentNoteRepository {
  readonly notes: Array<{
    id: string;
    projectId: string;
    taskId: string;
    content: string;
    createdOnUtc: string;
  }> = [];

  async add(note: Readonly<{
    id: string;
    projectId: string;
    taskId: string;
    content: string;
    createdOnUtc: string;
  }>): Promise<void> {
    this.notes.push({ ...note });
  }

  async listByTask(taskId: string, projectId: string): Promise<ReadonlyArray<{
    id: string;
    projectId: string;
    taskId: string;
    content: string;
    createdOnUtc: string;
  }>> {
    return this.notes
      .filter((n) => n.taskId === taskId && n.projectId === projectId)
      .map((n) => ({ ...n }));
  }
}

interface MutableProjectKeyRecord {
  id: string;
  projectId: string;
  keyHash: string;
  description: string;
  isActive: boolean;
  createdOnUtc: string;
}

export class InMemoryProjectKeyRepository implements ProjectKeyRepository {
  readonly keys: MutableProjectKeyRecord[] = [];

  async listByProject(projectId: string): Promise<ReadonlyArray<ProjectKeyRecord>> {
    return this.keys.filter(k => k.projectId === projectId).map(k => ({ ...k }));
  }

  async getByIdAndProject(id: string, projectId: string): Promise<ProjectKeyRecord | null> {
    const key = this.keys.find(k => k.id === id && k.projectId === projectId);
    return key ? { ...key } : null;
  }

  async add(record: ProjectKeyRecord): Promise<void> {
    this.keys.push({ ...record });
  }

  async deactivate(id: string): Promise<void> {
    const key = this.keys.find(k => k.id === id);
    if (key) key.isActive = false;
  }

  async delete(id: string): Promise<void> {
    const idx = this.keys.findIndex(k => k.id === id);
    if (idx !== -1) this.keys.splice(idx, 1);
  }
}

export class FakeKeyHasher implements KeyHasher {
  hash(key: string): string {
    return `hash::${key}`;
  }
}

export class FakePasswordHasher implements PasswordHasher {
  hash(plainTextPassword: string): string {
    return `hash::${plainTextPassword}`;
  }
  verify(plainTextPassword: string, passwordHash: string): boolean {
    return this.hash(plainTextPassword) === passwordHash;
  }
}

export class FakeUnitOfWork implements UnitOfWork {
  saveChangesCalls = 0;
  async saveChanges(): Promise<void> {
    this.saveChangesCalls++;
  }
}

export class InMemoryAuditEventRepository implements AuditEventRepository {
  readonly events: AuditEventRecord[] = [];

  async listRecentByProject(projectId: string, limit: number): Promise<ReadonlyArray<AuditEventRecord>> {
    return this.events
      .slice()
      .reverse()
      .slice(0, limit)
      .map((e) => ({ ...e }));
  }
}

export class FakeClock implements Clock {
  constructor(private readonly now: Date) {}
  get utcNow(): Date {
    return this.now;
  }
}
