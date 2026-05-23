/**
 * Error de dominio. Sustituye a `DomainException` de la implementacion previa.
 * Se lanza cuando una invariante o regla de negocio del dominio es violada.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
