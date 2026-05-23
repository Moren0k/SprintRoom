import { newUuid, type Brand } from "./id-factory";

export type UserStoryId = Brand<string, "UserStoryId">;

export const UserStoryId = {
  new(): UserStoryId {
    return newUuid() as UserStoryId;
  },
  from(value: string): UserStoryId {
    return value as UserStoryId;
  },
};
