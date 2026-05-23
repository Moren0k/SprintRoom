export type ProjectRole = "Viewer" | "Contributor" | "Maintainer" | "Owner";
export type SystemRole = "Member" | "Administrator";

export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  systemRole: SystemRole;
  origin: string;
}

export interface AuthResult {
  userId: string;
  email: string;
  requiresRedirectToLogin: boolean;
}

export interface ProjectSummary {
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

export interface ProjectMember {
  userId: string;
  fullName: string;
  email: string;
  projectRole: ProjectRole;
}

export interface ProjectDetail {
  projectId: string;
  name: string;
  description: string;
  externalReference: string;
  progress: number;
  members: ProjectMember[];
  userStoryCount: number;
  taskCount: number;
}

export interface UserStorySummary {
  userStoryId: string;
  title: string;
  description: string;
  progress: number;
}

export interface UserStoryDetail {
  userStoryId: string;
  projectId: string;
  title: string;
  description: string;
  progress: number;
  taskCount: number;
}

export interface TaskSummary {
  sprintTaskId: string;
  projectId: string;
  userStoryId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  assigneeIds: string[];
  commentCount: number;
}

export interface TaskComment {
  commentId: string;
  authorId: string;
  body: string;
  createdOnUtc: string;
}

export interface TaskDetail {
  sprintTaskId: string;
  projectId: string;
  userStoryId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  assigneeIds: string[];
  comments: TaskComment[];
}

export interface ProjectMemberDetail {
  userId: string;
  fullName: string;
  email: string;
  projectRole: ProjectRole;
  totalAssignedTasks: number;
  completedAssignedTasks: number;
  pendingAssignedTasks: number;
  assignedTasksCompletionRate: number;
  userStories: UserStorySummary[];
  assignedTasks: TaskSummary[];
}
