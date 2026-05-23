import { newUuid, type Brand } from "./id-factory";

export type ProjectId = Brand<string, "ProjectId">;

export const ProjectId = {
  new(): ProjectId {
    return newUuid() as ProjectId;
  },
  from(value: string): ProjectId {
    return value as ProjectId;
  },
};
