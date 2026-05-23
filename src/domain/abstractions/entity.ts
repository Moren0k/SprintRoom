/**
 * Entidad base: encapsula el identificador fuerte de la entidad.
 * `TId` debe implementar igualdad estructural a traves del helper `equals`.
 */
export abstract class Entity<TId> {
  readonly id: TId;

  protected constructor(id: TId) {
    this.id = id;
  }
}
