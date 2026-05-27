import { describe, expect, it } from "vitest";
import { assertAuthenticatedMutation, assertSameOriginMutation } from "../../src/server/security";

describe("server security", () => {
  it("acepta mutaciones same-origin", () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
      headers: { origin: "https://example.com" },
    });
    expect(() => assertSameOriginMutation(request)).not.toThrow();
  });

  it("rechaza origen distinto", () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
      headers: { origin: "https://evil.com" },
    });
    expect(() => assertSameOriginMutation(request)).toThrow();
  });

  it("requiere csrf valido en mutaciones autenticadas", () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
      headers: {
        origin: "https://example.com",
        cookie: "insforge_csrf_token=token-123",
        "x-csrf-token": "token-123",
      },
    });
    expect(() => assertAuthenticatedMutation(request)).not.toThrow();
  });

  it("rechaza csrf ausente o distinto", () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
      headers: {
        origin: "https://example.com",
        cookie: "insforge_csrf_token=token-123",
        "x-csrf-token": "otro-token",
      },
    });
    expect(() => assertAuthenticatedMutation(request)).toThrow();
  });
});
