import { newUuid, type Brand } from "./id-factory";

export type TaskCommentId = Brand<string, "TaskCommentId">;

export const TaskCommentId = {
  new(): TaskCommentId {
    return newUuid() as TaskCommentId;
  },
  from(value: string): TaskCommentId {
    return value as TaskCommentId;
  },
};
