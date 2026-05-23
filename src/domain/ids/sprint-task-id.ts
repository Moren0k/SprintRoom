import { newUuid, type Brand } from "./id-factory";

export type SprintTaskId = Brand<string, "SprintTaskId">;

export const SprintTaskId = {
  new(): SprintTaskId {
    return newUuid() as SprintTaskId;
  },
  from(value: string): SprintTaskId {
    return value as SprintTaskId;
  },
};
