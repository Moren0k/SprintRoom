import { describe, expect, it } from "vitest";
import { DomainError } from "../../../src/domain/errors/domain-error";
import { ExternalReference } from "../../../src/domain/value-objects/external-reference";

describe("ExternalReference", () => {
  it("should allow empty reference", () => {
    const reference = ExternalReference.create(null);
    expect(reference.value).toBe("");
  });

  it("should reject relative reference", () => {
    expect(() => ExternalReference.create("/repo")).toThrow(DomainError);
  });
});
