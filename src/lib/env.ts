export interface SprintRoomEnv {
  readonly insforgeUrl: string;
  readonly insforgeAnonKey: string;
  readonly insforgeApiKey: string;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`Falta la variable de entorno requerida ${name}. Revisa .env.example.`);
  }
  return value;
}

export function readSprintRoomEnv(): SprintRoomEnv {
  return {
    insforgeUrl: readRequiredEnv("INSFORGE_URL"),
    insforgeAnonKey: readRequiredEnv("INSFORGE_ANON_KEY"),
    insforgeApiKey: readRequiredEnv("INSFORGE_API_KEY"),
  };
}
