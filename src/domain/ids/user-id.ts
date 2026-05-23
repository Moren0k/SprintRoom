import { newUuid, type Brand } from "./id-factory";

export type UserId = Brand<string, "UserId">;

export const UserId = {
  new(): UserId {
    return newUuid() as UserId;
  },
  from(value: string): UserId {
    return value as UserId;
  },
};
