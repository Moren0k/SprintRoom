export class PersistenceError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "PersistenceError";
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class PersistenceMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistenceMappingError";
  }
}
