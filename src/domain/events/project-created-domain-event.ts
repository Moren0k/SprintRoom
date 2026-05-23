import type { DomainEvent } from "../abstractions/domain-event";
import type { ProjectId } from "../ids/project-id";
import type { UserId } from "../ids/user-id";

export class ProjectCreatedDomainEvent implements DomainEvent {
  readonly projectId: ProjectId;
  readonly ownerId: UserId;
  readonly occurredOnUtc: Date;

  constructor(projectId: ProjectId, ownerId: UserId, occurredOnUtc: Date) {
    this.projectId = projectId;
    this.ownerId = ownerId;
    this.occurredOnUtc = occurredOnUtc;
  }
}
