import type { SprintTask } from "../aggregates/sprint-task";
import type { UserStory } from "../aggregates/user-story";

export const ProjectProgressCalculator = {
  /**
   * Avance global del proyecto: promedio simple del avance de cada historia
   * de usuario. Si no hay historias, devuelve 0.
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
    if (stories.length === 0) {
      return 0;
    }
    const total = stories
      .map((story) => story.calculateProgress(tasks))
      .reduce((sum, value) => sum + value, 0);
    return total / stories.length;
  },
} as const;
