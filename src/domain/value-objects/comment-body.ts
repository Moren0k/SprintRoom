import { ValueObject } from "../abstractions/value-object";
import { DomainError } from "../errors/domain-error";

export class CommentBody extends ValueObject {
  static readonly MaxLength = 2000;

  readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  static create(value: string | null | undefined): CommentBody {
    if (value === null || value === undefined || value.trim().length === 0) {
      throw new DomainError("El comentario es obligatorio.");
    }
    const normalized = value.trim();
    if (normalized.length > CommentBody.MaxLength) {
      throw new DomainError(
        `El comentario no puede superar ${CommentBody.MaxLength} caracteres.`,
      );
    }
    return new CommentBody(normalized);
  }

  protected getEqualityComponents(): ReadonlyArray<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
