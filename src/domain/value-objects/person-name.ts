import { ValueObject } from "../abstractions/value-object";
import { DomainError } from "../errors/domain-error";

export class PersonName extends ValueObject {
  static readonly MaxLength = 120;

  readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  static create(value: string | null | undefined): PersonName {
    if (value === null || value === undefined || value.trim().length === 0) {
      throw new DomainError("El nombre es obligatorio.");
    }
    const normalized = value.trim();
    if (normalized.length > PersonName.MaxLength) {
      throw new DomainError(
        `El nombre no puede superar ${PersonName.MaxLength} caracteres.`,
      );
    }
    return new PersonName(normalized);
  }

  protected getEqualityComponents(): ReadonlyArray<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
