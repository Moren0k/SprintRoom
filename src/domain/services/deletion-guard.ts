import { DomainError } from "../errors/domain-error";
import { DeletionConfirmationPolicy } from "./deletion-confirmation-policy";

export const DeletionGuard = {
  destructiveConfirmation: "ELIMINAR TODO",

  ensureProjectCanBeDeleted(
    expectedName: string,
    providedName: string,
    destructiveConfirmation: string,
  ): void {
    DeletionConfirmationPolicy.ensureConfirmation(expectedName, providedName);
    this.ensureDestructiveConfirmation(destructiveConfirmation);
  },

  ensureUserStoryCanBeDeleted(
    expectedName: string,
    providedName: string,
    destructiveConfirmation: string,
  ): void {
    DeletionConfirmationPolicy.ensureConfirmation(expectedName, providedName);
    this.ensureDestructiveConfirmation(destructiveConfirmation);
  },

  ensureDestructiveConfirmation(value: string): void {
    if (value.trim() !== this.destructiveConfirmation) {
      throw new DomainError(
        `La segunda confirmacion debe ser exactamente ${this.destructiveConfirmation}.`,
      );
    }
  },
} as const;
