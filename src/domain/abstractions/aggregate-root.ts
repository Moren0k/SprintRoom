import { Entity } from "./entity";
import type { DomainEvent } from "./domain-event";

/**
 * Raiz de agregado: ademas de ser entidad expone una bandeja de eventos de
 * dominio que se publican durante la mutacion de la raiz.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private readonly _domainEvents: DomainEvent[] = [];

  protected constructor(id: TId) {
    super(id);
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected raise(domainEvent: DomainEvent): void {
    if (domainEvent === null || domainEvent === undefined) {
      throw new TypeError("El evento de dominio es obligatorio.");
    }
    this._domainEvents.push(domainEvent);
  }

  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }
}
