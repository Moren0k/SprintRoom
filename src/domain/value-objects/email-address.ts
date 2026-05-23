import { ValueObject } from "../abstractions/value-object";
import { DomainError } from "../errors/domain-error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddress extends ValueObject {
  readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  static create(value: string | null | undefined): EmailAddress {
    if (value === null || value === undefined || value.trim().length === 0) {
      throw new DomainError("El correo es obligatorio.");
    }
    const normalized = value.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      throw new DomainError("El correo no tiene un formato valido.");
    }
    return new EmailAddress(normalized);
  }

  protected getEqualityComponents(): ReadonlyArray<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
