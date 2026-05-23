import { ValueObject } from "../abstractions/value-object";
import { DomainError } from "../errors/domain-error";

export class Description extends ValueObject {
  static readonly MaxLength = 2000;

  readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  static create(value: string | null | undefined): Description {
    const normalized = value?.trim() ?? "";
    if (normalized.length > Description.MaxLength) {
      throw new DomainError(
        `La descripcion no puede superar ${Description.MaxLength} caracteres.`,
      );
    }
    return new Description(normalized);
  }

  protected getEqualityComponents(): ReadonlyArray<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
