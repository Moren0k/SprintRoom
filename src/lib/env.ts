export interface SprintRoomEnv {
  readonly insforgeUrl: string;
  readonly insforgeAnonKey: string;
  readonly insforgeApiKey: string;
  readonly appUrl: string;
  readonly upstashRedisRestUrl: string | null;
  readonly upstashRedisRestToken: string | null;
  readonly trustProxyHeaders: boolean;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`Falta la variable de entorno requerida ${name}. Revisa .env.example.`);
  }
  return value;
}

function readOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    return null;
  }
  return value;
}

export function readSprintRoomEnv(): SprintRoomEnv {
  return {
    insforgeUrl: readRequiredEnv("INSFORGE_URL"),
    insforgeAnonKey: readRequiredEnv("INSFORGE_ANON_KEY"),
    insforgeApiKey: readRequiredEnv("INSFORGE_API_KEY"),
    appUrl: readRequiredEnv("NEXT_PUBLIC_APP_URL"),
    upstashRedisRestUrl: readOptionalEnv("UPSTASH_REDIS_REST_URL"),
    upstashRedisRestToken: readOptionalEnv("UPSTASH_REDIS_REST_TOKEN"),
    trustProxyHeaders: process.env.TRUST_PROXY_HEADERS === "true",
  };
}
