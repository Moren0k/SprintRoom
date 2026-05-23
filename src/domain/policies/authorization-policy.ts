import { PermissionAction } from "../enums/permission-action";
import { ProjectRole } from "../enums/project-role";
import { SystemRole } from "../enums/system-role";

export const AuthorizationPolicy = {
  canCreateProject(systemRole: SystemRole): boolean {
    return systemRole === SystemRole.Member || systemRole === SystemRole.Administrator;
  },

  canPerformProjectAction(projectRole: ProjectRole, action: PermissionAction): boolean {
    switch (action) {
      case PermissionAction.ViewProjectDetails:
      case PermissionAction.ViewMemberDetail:
        return true;
      case PermissionAction.CreateUserStory:
      case PermissionAction.CreateTask:
        return (
          projectRole === ProjectRole.Owner ||
          projectRole === ProjectRole.Maintainer ||
          projectRole === ProjectRole.Contributor
        );
      case PermissionAction.EditProjectDocumentation:
      case PermissionAction.ManageMembers:
      case PermissionAction.DeleteProject:
      case PermissionAction.DeleteUserStory:
      case PermissionAction.DeleteTask:
        return (
          projectRole === ProjectRole.Owner || projectRole === ProjectRole.Maintainer
        );
      default:
        return false;
    }
  },
} as const;
