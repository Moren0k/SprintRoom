import { describe, expect, it } from "vitest";
import { DomainError } from "../../../src/domain/errors/domain-error";
import { DeletionGuard } from "../../../src/domain/services/deletion-guard";

describe("DeletionGuard", () => {
  it("ensureProjectCanBeDeleted should reject when project still has children", () => {
    expect(() =>
      DeletionGuard.ensureProjectCanBeDeleted("Proyecto A", "Proyecto A", true, false),
    ).toThrow(DomainError);
  });

  it("ensureUserStoryCanBeDeleted should reject when confirmation does not match", () => {
    expect(() =>
      DeletionGuard.ensureUserStoryCanBeDeleted("HU-1", "HU-2", false),
    ).toThrow(DomainError);
  });
});
