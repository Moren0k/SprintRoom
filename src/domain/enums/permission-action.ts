/**
 * Acciones controladas por la politica de autorizacion del dominio.
 */
export const PermissionAction = {
  CreateProject: "CreateProject",
  ManageMembers: "ManageMembers",
  EditProjectDocumentation: "EditProjectDocumentation",
  CreateUserStory: "CreateUserStory",
  CreateTask: "CreateTask",
  DeleteProject: "DeleteProject",
  DeleteUserStory: "DeleteUserStory",
  DeleteTask: "DeleteTask",
  ViewProjectDetails: "ViewProjectDetails",
  ViewMemberDetail: "ViewMemberDetail",
} as const;

export type PermissionAction =
  (typeof PermissionAction)[keyof typeof PermissionAction];
