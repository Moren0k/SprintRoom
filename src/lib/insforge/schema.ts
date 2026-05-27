import { AccountOrigin, type AccountOrigin as AccountOriginType } from "../../domain/enums/account-origin";
import { ProjectRole, type ProjectRole as ProjectRoleType } from "../../domain/enums/project-role";
import { SystemRole, type SystemRole as SystemRoleType } from "../../domain/enums/system-role";
import { TaskStatus, type TaskStatus as TaskStatusType } from "../../domain/enums/task-status";
import { PersistenceMappingError } from "./errors";

export interface UserRow {
  readonly id: string;
  readonly full_name: string;
  readonly email: string;
  readonly password_hash: string;
  readonly system_role: number;
  readonly account_origin: number;
  readonly created_on_utc: string;
  readonly updated_on_utc: string;
}

export interface ProjectRow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly external_reference: string;
  readonly owner_id: string;
  readonly created_on_utc: string;
  readonly updated_on_utc: string;
}

export interface ProjectMemberRow {
  readonly project_id: string;
  readonly user_id: string;
  readonly role: number;
  readonly joined_on_utc: string;
}

export interface UserStoryRow {
  readonly id: string;
  readonly project_id: string;
  readonly title: string;
  readonly description: string;
  readonly created_on_utc: string;
  readonly updated_on_utc: string;
}

export interface SprintTaskRow {
  readonly id: string;
  readonly project_id: string;
  readonly user_story_id: string;
  readonly title: string;
  readonly description: string;
  readonly is_completed: boolean;
  readonly status: string;
  readonly created_on_utc: string;
  readonly updated_on_utc: string;
}

export interface SprintTaskAssignmentRow {
  readonly task_id: string;
  readonly user_id: string;
}

export interface TaskCommentRow {
  readonly id: string;
  readonly task_id: string;
  readonly author_id: string;
  readonly body: string;
  readonly created_on_utc: string;
}

export interface ProjectKeyRow {
  readonly id: string;
  readonly project_id: string;
  readonly key_fingerprint: string | null;
  readonly key_hash: string;
  readonly description: string;
  readonly is_active: boolean;
  readonly created_on_utc: string;
}

export interface TaskAgentNoteRow {
  readonly id: string;
  readonly project_id: string;
  readonly task_id: string;
  readonly content: string;
  readonly created_on_utc: string;
}

export interface AuditEventRow {
  readonly id: string;
  readonly project_id: string | null;
  readonly actor_id: string | null;
  readonly action: string;
  readonly entity_type: string;
  readonly entity_id: string;
  readonly occurred_on_utc: string;
  readonly metadata: Record<string, unknown>;
}

export interface RetainedTaskCommentRow {
  readonly comment_id: string;
  readonly task_id: string;
  readonly author_id: string;
  readonly body: string;
  readonly created_on_utc: string;
  readonly retained_on_utc: string;
  readonly retained_by: string | null;
  readonly reason: string;
}

const systemRoleToDb = new Map<SystemRoleType, number>([
  [SystemRole.Member, 1],
  [SystemRole.Administrator, 2],
]);

const accountOriginToDb = new Map<AccountOriginType, number>([
  [AccountOrigin.PublicRegistration, 1],
  [AccountOrigin.AdministrativeProvisioning, 2],
  [AccountOrigin.GoogleOAuth, 3],
]);

const projectRoleToDb = new Map<ProjectRoleType, number>([
  [ProjectRole.Viewer, 1],
  [ProjectRole.Contributor, 2],
  [ProjectRole.Maintainer, 3],
  [ProjectRole.Owner, 4],
]);

function mapToDatabase<T>(map: ReadonlyMap<T, number>, value: T, label: string): number {
  const mapped = map.get(value);
  if (mapped === undefined) {
    throw new PersistenceMappingError(`No existe mapeo de ${label} para ${String(value)}.`);
  }
  return mapped;
}

function mapFromDatabase<T>(map: ReadonlyMap<T, number>, value: number, label: string): T {
  for (const [domainValue, dbValue] of map.entries()) {
    if (dbValue === value) {
      return domainValue;
    }
  }
  throw new PersistenceMappingError(`No existe mapeo de ${label} para codigo ${value}.`);
}

export function toSystemRoleCode(value: SystemRoleType): number {
  return mapToDatabase(systemRoleToDb, value, "SystemRole");
}

export function fromSystemRoleCode(value: number): SystemRoleType {
  return mapFromDatabase(systemRoleToDb, value, "SystemRole");
}

export function toAccountOriginCode(value: AccountOriginType): number {
  return mapToDatabase(accountOriginToDb, value, "AccountOrigin");
}

export function fromAccountOriginCode(value: number): AccountOriginType {
  return mapFromDatabase(accountOriginToDb, value, "AccountOrigin");
}

export function toProjectRoleCode(value: ProjectRoleType): number {
  return mapToDatabase(projectRoleToDb, value, "ProjectRole");
}

export function fromProjectRoleCode(value: number): ProjectRoleType {
  return mapFromDatabase(projectRoleToDb, value, "ProjectRole");
}

export function toTaskStatusCode(value: TaskStatusType): string {
  return value;
}

export function fromTaskStatusCode(value: string): TaskStatusType {
  if (Object.values(TaskStatus).includes(value as TaskStatusType)) {
    return value as TaskStatusType;
  }
  throw new PersistenceMappingError(`Codigo de estado de tarea desconocido: ${value}.`);
}
