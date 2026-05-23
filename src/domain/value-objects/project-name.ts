import { ValueObject } from "../abstractions/value-object";
import { DomainError } from "../errors/domain-error";

export class ProjectName extends ValueObject {
  static readonly MaxLength = 150;

  readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  static create(value: string | null | undefined): ProjectName {
    if (value === null || value === undefined || value.trim().length === 0) {
      throw new DomainError("El nombre del proyecto es obligatorio.");
    }
    const normalized = value.trim();
    if (normalized.length > ProjectName.MaxLength) {
      throw new DomainError(
        `El nombre del proyecto no puede superar ${ProjectName.MaxLength} caracteres.`,
      );
    }
    return new ProjectName(normalized);
  }

  protected getEqualityComponents(): ReadonlyArray<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
