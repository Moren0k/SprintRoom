import { ValueObject } from "../abstractions/value-object";
import { DomainError } from "../errors/domain-error";

/**
 * Comprueba si `value` es una URL absoluta valida. Equivalente a
 * `Uri.TryCreate(value, UriKind.Absolute, out _)` de C#.
 */
function isAbsoluteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    // Una URL absoluta valida debe tener al menos protocolo + host (salvo
    // esquemas especiales). Para el dominio basta con verificar que el
    // protocolo este definido.
    return Boolean(url.protocol);
  } catch {
    return false;
  }
}

export class ExternalReference extends ValueObject {
  static readonly MaxLength = 300;

  readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  static create(value: string | null | undefined): ExternalReference {
    const normalized = value?.trim() ?? "";
    if (normalized.length === 0) {
      return new ExternalReference("");
    }
    if (!isAbsoluteUrl(normalized)) {
      throw new DomainError(
        "La referencia externa debe ser una URL absoluta valida.",
      );
    }
    if (normalized.length > ExternalReference.MaxLength) {
      throw new DomainError(
        `La referencia externa no puede superar ${ExternalReference.MaxLength} caracteres.`,
      );
    }
    return new ExternalReference(normalized);
  }

  protected getEqualityComponents(): ReadonlyArray<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
