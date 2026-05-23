import { DomainError } from "../errors/domain-error";
import { DeletionConfirmationPolicy } from "./deletion-confirmation-policy";

export const DeletionGuard = {
  ensureProjectCanBeDeleted(
    expectedName: string,
    providedName: string,
    hasUserStories: boolean,
    hasTasks: boolean,
  ): void {
    DeletionConfirmationPolicy.ensureConfirmation(expectedName, providedName);
    if (hasUserStories || hasTasks) {
      throw new DomainError(
        "No se puede eliminar un proyecto con historias de usuario o tareas asociadas.",
      );
    }
  },

  ensureUserStoryCanBeDeleted(
    expectedName: string,
    providedName: string,
    hasTasks: boolean,
  ): void {
    DeletionConfirmationPolicy.ensureConfirmation(expectedName, providedName);
    if (hasTasks) {
      throw new DomainError(
        "No se puede eliminar una historia de usuario con tareas asociadas.",
      );
    }
  },
} as const;
