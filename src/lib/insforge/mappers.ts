import { Project } from "../../domain/aggregates/project";
import { SprintTask } from "../../domain/aggregates/sprint-task";
import { User } from "../../domain/aggregates/user";
import { UserStory } from "../../domain/aggregates/user-story";
import { ProjectMember } from "../../domain/entities/project-member";
import { TaskComment } from "../../domain/entities/task-comment";
import { ProjectId } from "../../domain/ids/project-id";
import { SprintTaskId } from "../../domain/ids/sprint-task-id";
import { TaskCommentId } from "../../domain/ids/task-comment-id";
import { UserId } from "../../domain/ids/user-id";
import { UserStoryId } from "../../domain/ids/user-story-id";
import { CommentBody } from "../../domain/value-objects/comment-body";
import { Description } from "../../domain/value-objects/description";
import { EmailAddress } from "../../domain/value-objects/email-address";
import { ExternalReference } from "../../domain/value-objects/external-reference";
import { PersonName } from "../../domain/value-objects/person-name";
import { ProjectName } from "../../domain/value-objects/project-name";
import { WorkItemName } from "../../domain/value-objects/work-item-name";
import type {
  ProjectMemberRow,
  ProjectRow,
  SprintTaskAssignmentRow,
  SprintTaskRow,
  TaskCommentRow,
  UserRow,
  UserStoryRow,
} from "./schema";
import {
  fromAccountOriginCode,
  fromProjectRoleCode,
  fromSystemRoleCode,
  fromTaskStatusCode,
  toAccountOriginCode,
  toProjectRoleCode,
  toSystemRoleCode,
  toTaskStatusCode,
} from "./schema";

function toDate(value: string): Date {
  return new Date(value);
}

function toIso(value: Date): string {
  return value.toISOString();
}

export function userFromRow(row: UserRow): User {
  return User.rehydrate(
    UserId.from(row.id),
    PersonName.create(row.full_name),
    EmailAddress.create(row.email),
    row.password_hash,
    fromSystemRoleCode(row.system_role),
    fromAccountOriginCode(row.account_origin),
    toDate(row.created_on_utc),
    toDate(row.updated_on_utc),
  );
}

export function userToRow(user: User): UserRow {
  return {
    id: user.id,
    full_name: user.fullName.value,
    email: user.email.value,
    password_hash: user.passwordHash,
    system_role: toSystemRoleCode(user.systemRole),
    account_origin: toAccountOriginCode(user.origin),
    created_on_utc: toIso(user.createdOnUtc),
    updated_on_utc: toIso(user.updatedOnUtc),
  };
}

export function projectMemberFromRow(row: ProjectMemberRow): ProjectMember {
  return new ProjectMember(
    UserId.from(row.user_id),
    fromProjectRoleCode(row.role),
    toDate(row.joined_on_utc),
  );
}

export function projectMemberToRow(projectId: ProjectId, member: ProjectMember): ProjectMemberRow {
  return {
    project_id: projectId,
    user_id: member.id,
    role: toProjectRoleCode(member.role),
    joined_on_utc: toIso(member.joinedOnUtc),
  };
}

export function projectFromRows(row: ProjectRow, memberRows: ReadonlyArray<ProjectMemberRow>): Project {
  return Project.rehydrate(
    ProjectId.from(row.id),
    ProjectName.create(row.name),
    Description.create(row.description),
    ExternalReference.create(row.external_reference),
    UserId.from(row.owner_id),
    toDate(row.created_on_utc),
    toDate(row.updated_on_utc),
    memberRows.map(projectMemberFromRow),
  );
}

export function projectToRow(project: Project): ProjectRow {
  return {
    id: project.id,
    name: project.name.value,
    description: project.description.value,
    external_reference: project.externalReference.value,
    owner_id: project.ownerId,
    created_on_utc: toIso(project.createdOnUtc),
    updated_on_utc: toIso(project.updatedOnUtc),
  };
}

export function userStoryFromRow(row: UserStoryRow): UserStory {
  return UserStory.rehydrate(
    UserStoryId.from(row.id),
    ProjectId.from(row.project_id),
    WorkItemName.create(row.title, "historia de usuario"),
    Description.create(row.description),
    toDate(row.created_on_utc),
    toDate(row.updated_on_utc),
  );
}

export function userStoryToRow(userStory: UserStory): UserStoryRow {
  return {
    id: userStory.id,
    project_id: userStory.projectId,
    title: userStory.title.value,
    description: userStory.description.value,
    created_on_utc: toIso(userStory.createdOnUtc),
    updated_on_utc: toIso(userStory.updatedOnUtc),
  };
}

export function taskCommentFromRow(row: TaskCommentRow): TaskComment {
  return new TaskComment(
    TaskCommentId.from(row.id),
    UserId.from(row.author_id),
    CommentBody.create(row.body),
    toDate(row.created_on_utc),
  );
}

export function taskCommentToRow(taskId: SprintTaskId, comment: TaskComment): TaskCommentRow {
  return {
    id: comment.id,
    task_id: taskId,
    author_id: comment.authorId,
    body: comment.body.value,
    created_on_utc: toIso(comment.createdOnUtc),
  };
}

export function sprintTaskFromRows(
  row: SprintTaskRow,
  assignmentRows: ReadonlyArray<SprintTaskAssignmentRow>,
  commentRows: ReadonlyArray<TaskCommentRow>,
): SprintTask {
  return SprintTask.rehydrate(
    SprintTaskId.from(row.id),
    ProjectId.from(row.project_id),
    UserStoryId.from(row.user_story_id),
    WorkItemName.create(row.title, "tarea"),
    Description.create(row.description),
    fromTaskStatusCode(row.status),
    toDate(row.created_on_utc),
    toDate(row.updated_on_utc),
    assignmentRows.map((assignment) => UserId.from(assignment.user_id)),
    commentRows.map(taskCommentFromRow),
  );
}

export function sprintTaskToRow(task: SprintTask): SprintTaskRow {
  return {
    id: task.id,
    project_id: task.projectId,
    user_story_id: task.userStoryId,
    title: task.title.value,
    description: task.description.value,
    is_completed: task.isCompleted,
    status: toTaskStatusCode(task.status),
    created_on_utc: toIso(task.createdOnUtc),
    updated_on_utc: toIso(task.updatedOnUtc),
  };
}

export function sprintTaskAssignmentToRows(task: SprintTask): SprintTaskAssignmentRow[] {
  return task.assigneeIds.map((assigneeId) => ({
    task_id: task.id,
    user_id: assigneeId,
  }));
}
