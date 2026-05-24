export const TaskStatus = {
  NotStarted: "not_started",
  InDevelopment: "in_progress",
  Testing: "testing",
  Review: "review",
  Completed: "completed",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.NotStarted]: "Sin Empezar",
  [TaskStatus.InDevelopment]: "En Desarrollo",
  [TaskStatus.Testing]: "Probando",
  [TaskStatus.Review]: "En Revisión",
  [TaskStatus.Completed]: "Completada",
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  TaskStatus.NotStarted,
  TaskStatus.InDevelopment,
  TaskStatus.Testing,
  TaskStatus.Review,
  TaskStatus.Completed,
];
