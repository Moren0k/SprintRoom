import type { SprintTask } from "../aggregates/sprint-task";
import type { UserStory } from "../aggregates/user-story";
import { getTaskStatusProgress } from "../enums/task-status";

export const ProjectProgressCalculator = {
  /**
   * Avance global del proyecto: promedio simple del avance de todas las
   * tareas del proyecto. Si no hay tareas, devuelve 0.
   */
  calculate(
    stories: ReadonlyArray<UserStory>,
    tasks: ReadonlyArray<SprintTask>,
  ): number {
    if (stories === null || stories === undefined) {
      throw new TypeError("Las historias son obligatorias.");
    }
    if (tasks === null || tasks === undefined) {
      throw new TypeError("Las tareas son obligatorias.");
    }
    if (stories.length === 0 || tasks.length === 0) {
      return 0;
    }
    const storyIds = new Set(stories.map((story) => story.id));
    const projectTasks = tasks.filter((task) => storyIds.has(task.userStoryId));
    if (projectTasks.length === 0) {
      return 0;
    }
    const total = projectTasks.reduce(
      (sum, task) => sum + getTaskStatusProgress(task.status),
      0,
    );
    return total / projectTasks.length;
  },
} as const;
