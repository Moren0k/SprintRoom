import { describe, expect, it } from "vitest";
import { PermissionAction } from "../../../src/domain/enums/permission-action";
import { ProjectRole } from "../../../src/domain/enums/project-role";
import { AuthorizationPolicy } from "../../../src/domain/policies/authorization-policy";

describe("AuthorizationPolicy.canPerformProjectAction", () => {
  it("should allow contributor to create task", () => {
    const result = AuthorizationPolicy.canPerformProjectAction(
      ProjectRole.Contributor,
      PermissionAction.CreateTask,
    );
    expect(result).toBe(true);
  });

  it("should reject viewer for member management", () => {
    const result = AuthorizationPolicy.canPerformProjectAction(
      ProjectRole.Viewer,
      PermissionAction.ManageMembers,
    );
    expect(result).toBe(false);
  });
});
