import { ValueObject } from "../abstractions/value-object";
import { DomainError } from "../errors/domain-error";

export class WorkItemName extends ValueObject {
  static readonly MaxLength = 160;

  readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  static create(value: string | null | undefined, fieldName: string): WorkItemName {
    if (value === null || value === undefined || value.trim().length === 0) {
      throw new DomainError(`El nombre de ${fieldName} es obligatorio.`);
    }
    const normalized = value.trim();
    if (normalized.length > WorkItemName.MaxLength) {
      throw new DomainError(
        `El nombre de ${fieldName} no puede superar ${WorkItemName.MaxLength} caracteres.`,
      );
    }
    return new WorkItemName(normalized);
  }

  protected getEqualityComponents(): ReadonlyArray<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
