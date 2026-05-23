import { DomainError } from "../errors/domain-error";

function normalize(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim().length === 0) {
    return "";
  }
  return value.trim();
}

export const DeletionConfirmationPolicy = {
  /**
   * Equivale a `EnsureConfirmation` de C#. Lanza `DomainError` cuando los
   * nombres no coinciden tras recortar espacios exteriores. La comparacion
   * es estricta y respeta mayusculas/minusculas.
   */
  ensureConfirmation(expectedName: string, providedName: string): void {
    const expected = normalize(expectedName);
    const provided = normalize(providedName);
    if (expected !== provided) {
      throw new DomainError(
        "La confirmacion de eliminacion no coincide con el nombre esperado.",
      );
    }
  },
} as const;
