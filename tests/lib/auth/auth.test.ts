import { describe, expect, it } from "vitest";
import { Pbkdf2PasswordHasher } from "../../../src/lib/auth/password-hasher";

describe("auth infrastructure", () => {
  it("hashes and verifies passwords with PBKDF2", () => {
    const hasher = new Pbkdf2PasswordHasher();
    const hash = hasher.hash("super-secret-password");

    expect(hash).toMatch(/^pbkdf2_sha256\$/);
    expect(hasher.verify("super-secret-password", hash)).toBe(true);
    expect(hasher.verify("wrong-password", hash)).toBe(false);
    expect(hasher.verify("super-secret-password", "malformed")).toBe(false);
  });
});
