import { describe, expect, it, vi } from "vitest";
import { getDefaultRateLimitStore, setDefaultRateLimitStore } from "../../src/server/rate-limit";

describe("rate limit production configuration", () => {
  it("falla cerrado en produccion sin store distribuido", () => {
    setDefaultRateLimitStore(null);
    vi.stubEnv("NODE_ENV", "production");
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    expect(() => getDefaultRateLimitStore()).toThrow(/UPSTASH_REDIS_REST_URL/);

    vi.unstubAllEnvs();
    setDefaultRateLimitStore(null);
  });
});
