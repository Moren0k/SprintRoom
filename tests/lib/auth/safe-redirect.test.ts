import { describe, expect, it } from "vitest";
import { readSafeAppPath } from "../../../src/lib/auth/safe-redirect";

describe("safe redirect", () => {
  it("acepta rutas internas permitidas", () => {
    expect(readSafeAppPath("/dashboard")).toBe("/dashboard");
    expect(readSafeAppPath("/projects/123?tab=overview")).toBe("/projects/123?tab=overview");
  });

  it("rechaza redirects maliciosos comunes", () => {
    expect(readSafeAppPath("//evil.com")).toBe("/dashboard");
    expect(readSafeAppPath("/\\evil.com")).toBe("/dashboard");
    expect(readSafeAppPath("/@evil.com")).toBe("/dashboard");
    expect(readSafeAppPath("https://evil.com")).toBe("/dashboard");
  });

  it("rechaza variantes encoded o fuera de allowlist", () => {
    expect(readSafeAppPath("/%2F%2Fevil.com")).toBe("/dashboard");
    expect(readSafeAppPath("/login")).toBe("/dashboard");
    expect(readSafeAppPath("/documentacion/guias")).toBe("/documentacion/guias");
  });
});
