import { describe, expect, it } from "vitest";
import { DomainError } from "../../../src/domain/errors/domain-error";
import { EmailAddress } from "../../../src/domain/value-objects/email-address";

describe("EmailAddress", () => {
  it("should normalize email", () => {
    const email = EmailAddress.create("  USER@Example.COM ");
    expect(email.value).toBe("user@example.com");
  });

  it("should reject invalid email", () => {
    expect(() => EmailAddress.create("correo-invalido")).toThrow(DomainError);
  });
});
