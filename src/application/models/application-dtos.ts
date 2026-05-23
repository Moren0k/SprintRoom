import type { ProjectRole } from "../../domain/enums/project-role";

/**
 * DTOs expuestos por la capa de aplicacion. Replican uno a uno los `record`
 * que existian en la implementacion previa en C#. Todos los identificadores
 * viajan como `string` (UUID) para mantener neutralidad respecto a la capa
 * de presentacion.
 */

export interface UserSummaryDto {
  userId: string;
  fullName: string;
  email: string;
}

export interface AuthenticationResultDto {
  userId: string;
  email: string;
  sessionToken: string;
  requiresRedirectToLogin: boolean;
}

export interface RegistrationResultDto {
  userId: string;
  email: string;
  requiresRedirectToLogin: boolean;
}

export interface UserProfileDto {
  userId: string;
  fullName: string;
  email: string;
  systemRole: string;
  origin: string;
}

export interface ProjectSummaryDto {
  projectId: string;
  name: string;
  description: string;
  externalReference: string;
  ownerId: string;
  isOwnedByCurrentUser: boolean;
  memberCount: number;
  userStoryCount: number;
  taskCount: number;
  progress: number;
}

export interface ProjectMemberDto {
  userId: string;
  fullName: string;
  email: string;
  projectRole: ProjectRole;
}

export interface ProjectDetailDto {
  projectId: string;
  name: string;
  description: string;
  externalReference: string;
  progress: number;
  members: ReadonlyArray<ProjectMemberDto>;
  userStoryCount: number;
  taskCount: number;
}

export interface UserStorySummaryDto {
  userStoryId: string;
  title: string;
  description: string;
  progress: number;
}

export interface UserStoryDetailDto {
  userStoryId: string;
  projectId: string;
  title: string;
  description: string;
  progress: number;
  taskCount: number;
}

export interface TaskSummaryDto {
  sprintTaskId: string;
  projectId: string;
  userStoryId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  assigneeIds: ReadonlyArray<string>;
  commentCount: number;
}

export interface TaskCommentDto {
  commentId: string;
  authorId: string;
  body: string;
  createdOnUtc: Date;
}

export interface TaskDetailDto {
  sprintTaskId: string;
  projectId: string;
  userStoryId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  assigneeIds: ReadonlyArray<string>;
  comments: ReadonlyArray<TaskCommentDto>;
}

export interface ProjectMemberDetailDto {
  userId: string;
  fullName: string;
  email: string;
  projectRole: ProjectRole;
  totalAssignedTasks: number;
  completedAssignedTasks: number;
  pendingAssignedTasks: number;
  assignedTasksCompletionRate: number;
  userStories: ReadonlyArray<UserStorySummaryDto>;
  assignedTasks: ReadonlyArray<TaskSummaryDto>;
}
