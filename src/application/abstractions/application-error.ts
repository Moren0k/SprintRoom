/**
 * Error de la capa de aplicacion. Sustituye a `ApplicationLayerException` de
 * la implementacion previa en C#.
 */
export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationError";
  }
}
