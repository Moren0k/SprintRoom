export interface SprintRoomEnv {
  readonly insforgeUrl: string;
  readonly insforgeAnonKey: string;
  readonly sessionTokenSecret: string;
  readonly sessionTokenTtlSeconds: number;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`Falta la variable de entorno requerida ${name}. Revisa .env.example.`);
  }
  return value;
}

function readOptionalIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw.length === 0) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`La variable de entorno ${name} debe ser un entero positivo.`);
  }
  return parsed;
}

export function readSprintRoomEnv(): SprintRoomEnv {
  return {
    insforgeUrl: readRequiredEnv("INSFORGE_URL"),
    insforgeAnonKey: readRequiredEnv("INSFORGE_ANON_KEY"),
    sessionTokenSecret: readRequiredEnv("SESSION_TOKEN_SECRET"),
    sessionTokenTtlSeconds: readOptionalIntegerEnv("SESSION_TOKEN_TTL_SECONDS", 86_400),
  };
}
