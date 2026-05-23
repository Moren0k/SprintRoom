/**
 * Contrato base de un evento de dominio. Cualquier evento debe exponer el
 * instante en el que ocurrio.
 */
export interface DomainEvent {
  readonly occurredOnUtc: Date;
}
