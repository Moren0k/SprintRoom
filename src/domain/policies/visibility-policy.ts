import { SystemRole } from "../enums/system-role";
import type { UserId } from "../ids/user-id";

export const VisibilityPolicy = {
  canViewProjectCatalog(isAuthenticated: boolean): boolean {
    return isAuthenticated;
  },

  canViewProjectDetails(systemRole: SystemRole, isProjectMember: boolean): boolean {
    return systemRole === SystemRole.Administrator || isProjectMember;
  },

  canViewPersonalWorkload(
    systemRole: SystemRole,
    requesterId: UserId,
    subjectId: UserId,
  ): boolean {
    return systemRole === SystemRole.Administrator || requesterId === subjectId;
  },
} as const;
