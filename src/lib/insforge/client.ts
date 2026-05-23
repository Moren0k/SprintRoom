import { createClient } from "@insforge/sdk";
import { readSprintRoomEnv, type SprintRoomEnv } from "../env";
import {
  SdkInsForgeDatabaseGateway,
  type InsForgeSdkClientLike,
} from "./database-gateway";

export type InsForgeClient = InsForgeSdkClientLike;

export function createSprintRoomInsForgeClient(env: SprintRoomEnv = readSprintRoomEnv()): InsForgeClient {
  return createClient({
    baseUrl: env.insforgeUrl,
    anonKey: env.insforgeAnonKey,
    isServerMode: true,
  }) as unknown as InsForgeClient;
}

export function createInsForgeDatabaseGateway(
  client: InsForgeClient = createSprintRoomInsForgeClient(),
): SdkInsForgeDatabaseGateway {
  return new SdkInsForgeDatabaseGateway(client);
}
