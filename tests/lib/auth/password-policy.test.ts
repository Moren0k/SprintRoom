import { describe, expect, it } from "vitest";
import { isStrongPassword, readPasswordPolicyError } from "../../../src/lib/auth/password-policy";

describe("password policy", () => {
  it("rechaza contrasenas cortas", () => {
    expect(readPasswordPolicyError("Ab1!short")).toContain("12 caracteres");
    expect(isStrongPassword("Ab1!short")).toBe(false);
  });

  it("rechaza cuando falta complejidad", () => {
    expect(readPasswordPolicyError("alllowercase123!")).toContain("mayuscula");
    expect(readPasswordPolicyError("ALLUPPERCASE123!")).toContain("minuscula");
    expect(readPasswordPolicyError("NoNumbers!!!!")).toContain("numero");
    expect(readPasswordPolicyError("NoSpecial1234")).toContain("especial");
  });

  it("acepta una contrasena fuerte", () => {
    expect(readPasswordPolicyError("SprintRoom#2026")).toBeNull();
    expect(isStrongPassword("SprintRoom#2026")).toBe(true);
  });
});
