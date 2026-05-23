import type { DomainEvent } from "../abstractions/domain-event";
import type { UserId } from "../ids/user-id";

export class UserRegisteredDomainEvent implements DomainEvent {
  readonly userId: UserId;
  readonly occurredOnUtc: Date;

  constructor(userId: UserId, occurredOnUtc: Date) {
    this.userId = userId;
    this.occurredOnUtc = occurredOnUtc;
  }
}
