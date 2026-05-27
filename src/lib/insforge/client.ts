import { createClient } from "@insforge/sdk";
import { readSprintRoomEnv, type SprintRoomEnv } from "../env";
import {
  SdkInsForgeDatabaseGateway,
  type InsForgeSdkClientLike,
} from "./database-gateway";

export type InsForgeClient = InsForgeSdkClientLike;

interface InsForgeClientOptions {
  readonly env?: SprintRoomEnv;
  readonly accessToken?: string;
}

export function createSprintRoomInsForgeClient(
  options: InsForgeClientOptions = {},
): InsForgeClient {
  const env = options.env ?? readSprintRoomEnv();
  return createClient({
    baseUrl: env.insforgeUrl,
    anonKey: env.insforgeAnonKey,
    isServerMode: true,
    edgeFunctionToken: options.accessToken,
  }) as unknown as InsForgeClient;
}

export function createSprintRoomAdminInsForgeClient(
  options: InsForgeClientOptions = {},
): InsForgeClient {
  const env = options.env ?? readSprintRoomEnv();
  return createClient({
    baseUrl: env.insforgeUrl,
    anonKey: env.insforgeApiKey,
    isServerMode: true,
    edgeFunctionToken: options.accessToken,
  }) as unknown as InsForgeClient;
}

export function createInsForgeDatabaseGateway(
  client?: InsForgeClient,
): SdkInsForgeDatabaseGateway {
  return new SdkInsForgeDatabaseGateway(
    client ?? createSprintRoomInsForgeClient(),
  );
}

export function createAdminInsForgeDatabaseGateway(
  client?: InsForgeClient,
): SdkInsForgeDatabaseGateway {
  return new SdkInsForgeDatabaseGateway(
    client ?? createSprintRoomAdminInsForgeClient(),
  );
}
