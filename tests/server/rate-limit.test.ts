import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InMemoryRateLimitStore,
  buildRateLimitKey,
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
  RATE_LIMIT_CONFIGS,
  setDefaultRateLimitStore,
} from "../../src/server/rate-limit";

beforeEach(() => {
  setDefaultRateLimitStore(null);
  delete process.env.TRUST_PROXY_HEADERS;
});

describe("InMemoryRateLimitStore", () => {
  it("permite requests dentro del limite", async () => {
    const store = new InMemoryRateLimitStore();
    for (let i = 0; i < 10; i++) {
      const result = await store.check("test:user-1", { windowMs: 60_000, maxRequests: 10 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9 - i);
    }
  });

  it("bloquea al exceder el limite", async () => {
    const store = new InMemoryRateLimitStore();
    const config = { windowMs: 60_000, maxRequests: 5 };

    for (let i = 0; i < 5; i++) {
      const result = await store.check("test:user-2", config);
      expect(result.allowed).toBe(true);
    }

    const blocked = await store.check("test:user-2", config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it("claves diferentes tienen contadores independientes", async () => {
    const store = new InMemoryRateLimitStore();
    const config = { windowMs: 60_000, maxRequests: 3 };

    await store.check("key-a", config);
    await store.check("key-a", config);
    await store.check("key-a", config);

    const keyAResult = await store.check("key-a", config);
    expect(keyAResult.allowed).toBe(false);

    const keyBResult = await store.check("key-b", config);
    expect(keyBResult.allowed).toBe(true);
    expect(keyBResult.remaining).toBe(2);
  });

  it("reinicia ventana despues de windowMs", async () => {
    vi.useFakeTimers();
    const store = new InMemoryRateLimitStore();
    const config = { windowMs: 60_000, maxRequests: 2 };

    await store.check("test:user-3", config);
    await store.check("test:user-3", config);

    const blocked = await store.check("test:user-3", config);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    const afterWindow = await store.check("test:user-3", config);
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(1);

    vi.useRealTimers();
  });

  it("reset limpia el store", async () => {
    const store = new InMemoryRateLimitStore();
    const config = { windowMs: 60_000, maxRequests: 1 };

    await store.check("test:reset-key", config);
    expect(store.size).toBe(1);

    store.reset();
    expect(store.size).toBe(0);

    const result = await store.check("test:reset-key", config);
    expect(result.allowed).toBe(true);
  });

  it("cleanup remueve entradas expiradas al hacer una nueva consulta", async () => {
    vi.useFakeTimers();
    const store = new InMemoryRateLimitStore();
    const config = { windowMs: 60_000, maxRequests: 1 };

    await store.check("test:old-key", config);
    expect(store.size).toBe(1);

    vi.advanceTimersByTime(6 * 60 * 1000);

    await store.check("test:new-key", config);
    expect(store.size).toBe(1);

    vi.useRealTimers();
  });
});

describe("checkRateLimit", () => {
  it("usa la configuracion por namespace", async () => {
    const store = new InMemoryRateLimitStore();
    const result = await checkRateLimit("mcp", "test-key", store);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMIT_CONFIGS.mcp.maxRequests - 1);
  });

  it("bloquea mcp al exceder 120 requests", async () => {
    const store = new InMemoryRateLimitStore();

    for (let i = 0; i < RATE_LIMIT_CONFIGS.mcp.maxRequests; i++) {
      const result = await checkRateLimit("mcp", "mcp-heavy-user", store);
      expect(result.allowed).toBe(true);
    }

    const blocked = await checkRateLimit("mcp", "mcp-heavy-user", store);
    expect(blocked.allowed).toBe(false);
  });

  it("bloquea auth login al exceder 10 requests", async () => {
    const store = new InMemoryRateLimitStore();

    for (let i = 0; i < RATE_LIMIT_CONFIGS.auth.maxRequests; i++) {
      await checkRateLimit("auth", "test@example.com", store);
    }

    const blocked = await checkRateLimit("auth", "test@example.com", store);
    expect(blocked.allowed).toBe(false);
  });

  it("bloquea register al exceder 5 requests", async () => {
    const store = new InMemoryRateLimitStore();

    for (let i = 0; i < RATE_LIMIT_CONFIGS.register.maxRequests; i++) {
      await checkRateLimit("register", "new@example.com", store);
    }

    const blocked = await checkRateLimit("register", "new@example.com", store);
    expect(blocked.allowed).toBe(false);
  });

  it("no afecta namespaces diferentes", async () => {
    const store = new InMemoryRateLimitStore();

    for (let i = 0; i < RATE_LIMIT_CONFIGS.auth.maxRequests; i++) {
      await checkRateLimit("auth", "shared-email", store);
    }

    const mcpResult = await checkRateLimit("mcp", "shared-email", store);
    expect(mcpResult.allowed).toBe(true);
    expect(mcpResult.remaining).toBe(RATE_LIMIT_CONFIGS.mcp.maxRequests - 1);
  });
});

describe("buildRateLimitKey", () => {
  it("construye clave con namespace e identificador", () => {
    expect(buildRateLimitKey("mcp", "key-123")).toBe("mcp:key-123");
    expect(buildRateLimitKey("auth", "user@example.com")).toBe("auth:user@example.com");
  });
});

describe("getClientIp", () => {
  it("no confia en x-forwarded-for por defecto", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("unknown");
  });

  it("usa x-forwarded-for solo cuando se habilita trust proxy", () => {
    process.env.TRUST_PROXY_HEADERS = "true";
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("192.168.1.1");
  });

  it("usa x-real-ip como fallback", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "10.0.0.5" },
    });
    expect(getClientIp(request)).toBe("10.0.0.5");
  });

  it("retorna unknown si no hay headers", () => {
    const request = new Request("https://example.com");
    expect(getClientIp(request)).toBe("unknown");
  });
});

describe("rateLimitResponse", () => {
  it("retorna 429 con JSON", async () => {
    const response = rateLimitResponse(30_000);
    expect(response.status).toBe(429);

    const body = await response.json() as Record<string, unknown>;
    expect(body).toHaveProperty("error");
    expect((body.error as Record<string, string>).code).toBe("rate_limit_exceeded");
    expect((body.error as Record<string, string>).message).toContain("30 segundos");
    expect(body.retryAfterSeconds).toBe(30);
  });

  it("incluye header Retry-After", () => {
    const response = rateLimitResponse(5_000);
    expect(response.headers.get("Retry-After")).toBe("5");
  });
});
