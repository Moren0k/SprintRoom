/**
 * Rate limiter basado en sliding window con almacenamiento en memoria local.
 *
 * LIMITACIONES CONOCIDAS (MVP):
 * - La memoria no se comparte entre instancias serverless.
 * - En Vercel/Edge, cada cold start arranca con un mapa vacio; el limiter
 *   solo es efectivo dentro de la misma instancia durante su ciclo de vida.
 * - No recomendado para produccion multi-instancia sin Redis/Upstash.
 *
 * Para migrar a Redis/Upstash, implementar la interfaz RateLimitStore
 * y reemplazar InMemoryRateLimitStore.
 */

/* ===================== Tipos ====================== */

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
  check(key: string, config: RateLimitConfig): RateLimitResult;
}

/* ===================== Configuraciones por namespace ====================== */

export const RATE_LIMIT_CONFIGS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  register: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  callback: { windowMs: 15 * 60 * 1000, maxRequests: 20 },
  mcp: { windowMs: 60 * 1000, maxRequests: 120 },
  imagine: { windowMs: 60 * 1000, maxRequests: 20 },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitNamespace = keyof typeof RATE_LIMIT_CONFIGS;

/* ===================== In-memory store ====================== */

interface RateLimitEntry {
  readonly count: number;
  readonly resetAt: number;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();
  private static readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

  check(key: string, config: RateLimitConfig): RateLimitResult {
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

  /** Exposed for testing */
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

/* ===================== Default store singleton ====================== */

let defaultStore: RateLimitStore | null = null;

export function getDefaultRateLimitStore(): RateLimitStore {
  if (defaultStore === null) {
    defaultStore = new InMemoryRateLimitStore();
  }
  return defaultStore;
}

/* ===================== Helpers ====================== */

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded !== null) {
    const ip = forwarded.split(",")[0].trim();
    if (ip.length > 0) return ip;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp !== null && realIp.length > 0) return realIp;
  return "unknown";
}

export function buildRateLimitKey(namespace: RateLimitNamespace, identifier: string): string {
  return `${namespace}:${identifier}`;
}

export function checkRateLimit(
  namespace: RateLimitNamespace,
  identifier: string,
  store: RateLimitStore = getDefaultRateLimitStore(),
): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[namespace];
  const key = buildRateLimitKey(namespace, identifier);
  return store.check(key, config);
}

/* ===================== Response builder ====================== */

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
