/**
 * Rate limiter con store intercambiable.
 *
 * Produccion: requiere store distribuido.
 * Desarrollo/tests: permite fallback en memoria para no bloquear el flujo local.
 */

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetMs: number;
}

export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
}

export interface RateLimitStore {
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
}

export const RATE_LIMIT_CONFIGS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  register: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  callback: { windowMs: 15 * 60 * 1000, maxRequests: 20 },
  recovery: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  mcp: { windowMs: 60 * 1000, maxRequests: 120 },
  imagine: { windowMs: 60 * 1000, maxRequests: 20 },
  chat: { windowMs: 60 * 1000, maxRequests: 15 },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitNamespace = keyof typeof RATE_LIMIT_CONFIGS;

interface RateLimitEntry {
  readonly count: number;
  readonly resetAt: number;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();
  private static readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    this.periodicCleanup(now);

    const existing = this.store.get(key);
    if (existing === undefined || now >= existing.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + config.windowMs });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetMs: config.windowMs,
      };
    }

    const newCount = existing.count + 1;
    this.store.set(key, { count: newCount, resetAt: existing.resetAt });

    if (newCount > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetMs: existing.resetAt - now,
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - newCount,
      resetMs: existing.resetAt - now,
    };
  }

  get size(): number {
    return this.store.size;
  }

  reset(): void {
    this.store.clear();
  }

  private periodicCleanup(now: number): void {
    if (now - this.lastCleanup < InMemoryRateLimitStore.CLEANUP_INTERVAL_MS) return;
    this.lastCleanup = now;
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

export class UpstashRedisRateLimitStore implements RateLimitStore {
  constructor(
    private readonly restUrl: string,
    private readonly restToken: string,
  ) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const windowEnd = windowStart + config.windowMs;
    const bucketKey = `${key}:${windowStart}`;

    const response = await fetch(`${this.restUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.restToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", bucketKey],
        ["PEXPIREAT", bucketKey, String(windowEnd)],
        ["PTTL", bucketKey],
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("No fue posible consultar el store distribuido de rate limit.");
    }

    const payload = await response.json() as Array<{ result?: string | number | null }>;
    const count = Number(payload[0]?.result ?? 0);
    const ttl = Number(payload[2]?.result ?? Math.max(windowEnd - now, 0));
    const remaining = Math.max(config.maxRequests - count, 0);

    return {
      allowed: count <= config.maxRequests,
      remaining,
      resetMs: ttl > 0 ? ttl : Math.max(windowEnd - now, 0),
    };
  }
}

let defaultStore: RateLimitStore | null = null;

export function getDefaultRateLimitStore(): RateLimitStore {
  if (defaultStore !== null) {
    return defaultStore;
  }

  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (restUrl && restToken) {
    defaultStore = new UpstashRedisRateLimitStore(
      restUrl,
      restToken,
    );
    return defaultStore;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Falta configurar UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN para rate limiting distribuido.",
    );
  }

  defaultStore = new InMemoryRateLimitStore();
  return defaultStore;
}

export function setDefaultRateLimitStore(store: RateLimitStore | null): void {
  defaultStore = store;
}

export function getClientIp(request: Request): string {
  const flyClientIp = readSingleIp(request.headers.get("fly-client-ip"));
  if (flyClientIp !== null) return flyClientIp;

  const cloudflareIp = readSingleIp(request.headers.get("cf-connecting-ip"));
  if (cloudflareIp !== null) return cloudflareIp;

  const realIp = readSingleIp(request.headers.get("x-real-ip"));
  if (realIp !== null) return realIp;

  if (process.env.TRUST_PROXY_HEADERS === "true") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded !== null) {
      const ip = readSingleIp(forwarded.split(",")[0] ?? null);
      if (ip !== null) return ip;
    }
  }

  return "unknown";
}

export function buildRateLimitKey(namespace: RateLimitNamespace, identifier: string): string {
  return `${namespace}:${identifier}`;
}

export async function checkRateLimit(
  namespace: RateLimitNamespace,
  identifier: string,
  store: RateLimitStore = getDefaultRateLimitStore(),
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[namespace];
  const key = buildRateLimitKey(namespace, identifier);
  return store.check(key, config);
}

export function rateLimitResponse(resetMs: number): Response {
  const retryAfter = Math.ceil(resetMs / 1000);
  return new Response(
    JSON.stringify({
      error: {
        code: "rate_limit_exceeded",
        message: `Demasiadas solicitudes. Intenta de nuevo en ${retryAfter} segundos.`,
      },
      retryAfterSeconds: retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

function readSingleIp(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.trim();
  if (normalized.length === 0) return null;

  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  if (!ipv4.test(normalized) && !ipv6.test(normalized)) {
    return null;
  }
  return normalized;
}
