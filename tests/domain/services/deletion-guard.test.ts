import { describe, expect, it } from "vitest";
import { DomainError } from "../../../src/domain/errors/domain-error";
import { DeletionGuard } from "../../../src/domain/services/deletion-guard";

describe("DeletionGuard", () => {
  it("ensureProjectCanBeDeleted should reject children without second confirmation", () => {
    expect(() =>
      DeletionGuard.ensureProjectCanBeDeleted("Proyecto A", "Proyecto A", ""),
    ).toThrow(DomainError);
  });

  it("ensureProjectCanBeDeleted should allow children with second confirmation", () => {
    expect(() =>
      DeletionGuard.ensureProjectCanBeDeleted("Proyecto A", "Proyecto A", "ELIMINAR TODO"),
    ).not.toThrow();
  });

  it("ensureUserStoryCanBeDeleted should reject when confirmation does not match", () => {
    expect(() =>
      DeletionGuard.ensureUserStoryCanBeDeleted("HU-1", "HU-2", ""),
    ).toThrow(DomainError);
  });
});
