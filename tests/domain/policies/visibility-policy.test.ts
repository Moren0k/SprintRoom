import { describe, expect, it } from "vitest";
import { SystemRole } from "../../../src/domain/enums/system-role";
import { UserId } from "../../../src/domain/ids/user-id";
import { VisibilityPolicy } from "../../../src/domain/policies/visibility-policy";

describe("VisibilityPolicy", () => {
  it("canViewProjectDetails should allow Administrator", () => {
    const result = VisibilityPolicy.canViewProjectDetails(
      SystemRole.Administrator,
      false,
    );
    expect(result).toBe(true);
  });

  it("canViewPersonalWorkload should allow owner of workload", () => {
    const userId = UserId.new();
    const result = VisibilityPolicy.canViewPersonalWorkload(
      SystemRole.Member,
      userId,
      userId,
    );
    expect(result).toBe(true);
  });
});
