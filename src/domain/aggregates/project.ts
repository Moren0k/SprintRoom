import { AggregateRoot } from "../abstractions/aggregate-root";
import { ProjectMember } from "../entities/project-member";
import { ProjectRole } from "../enums/project-role";
import { ProjectCreatedDomainEvent } from "../events/project-created-domain-event";
import { DomainError } from "../errors/domain-error";
import { ProjectId } from "../ids/project-id";
import type { UserId } from "../ids/user-id";
import type { Description } from "../value-objects/description";
import type { ExternalReference } from "../value-objects/external-reference";
import type { ProjectName } from "../value-objects/project-name";

export class Project extends AggregateRoot<ProjectId> {
  private _name: ProjectName;
  private _description: Description;
  private _externalReference: ExternalReference;
  private readonly _ownerId: UserId;
  private readonly _createdOnUtc: Date;
  private _updatedOnUtc: Date;
  private readonly _members: ProjectMember[] = [];

  private constructor(
    id: ProjectId,
    name: ProjectName,
    description: Description,
    externalReference: ExternalReference,
    ownerId: UserId,
    createdOnUtc: Date,
  ) {
    super(id);
    this._name = name;
    this._description = description;
    this._externalReference = externalReference;
    this._ownerId = ownerId;
    this._createdOnUtc = createdOnUtc;
    this._updatedOnUtc = createdOnUtc;
  }

  get name(): ProjectName {
    return this._name;
  }
  get description(): Description {
    return this._description;
  }
  get externalReference(): ExternalReference {
    return this._externalReference;
  }
  get ownerId(): UserId {
    return this._ownerId;
  }
  get createdOnUtc(): Date {
    return this._createdOnUtc;
  }
  get updatedOnUtc(): Date {
    return this._updatedOnUtc;
  }
  get members(): ReadonlyArray<ProjectMember> {
    return this._members;
  }

  static create(
    name: ProjectName,
    description: Description,
    externalReference: ExternalReference,
    ownerId: UserId,
    createdOnUtc: Date,
  ): Project {
    const project = new Project(
      ProjectId.new(),
      name,
      description,
      externalReference,
      ownerId,
      createdOnUtc,
    );
    project._members.push(
      new ProjectMember(ownerId, ProjectRole.Owner, createdOnUtc),
    );
    project.raise(
      new ProjectCreatedDomainEvent(project.id, ownerId, createdOnUtc),
    );
    return project;
  }

  static rehydrate(
    id: ProjectId,
    name: ProjectName,
    description: Description,
    externalReference: ExternalReference,
    ownerId: UserId,
    createdOnUtc: Date,
    updatedOnUtc: Date,
    members: ReadonlyArray<ProjectMember>,
  ): Project {
    const project = new Project(
      id,
      name,
      description,
      externalReference,
      ownerId,
      createdOnUtc,
    );
    project._updatedOnUtc = updatedOnUtc;
    project._members.push(...members);
    return project;
  }

  updateDocumentation(
    name: ProjectName,
    description: Description,
    externalReference: ExternalReference,
    updatedOnUtc: Date,
  ): void {
    this._name = name;
    this._description = description;
    this._externalReference = externalReference;
    this._updatedOnUtc = updatedOnUtc;
  }

  addMember(userId: UserId, role: ProjectRole, joinedOnUtc: Date): void {
    if (this._members.some((member) => member.id === userId)) {
      throw new DomainError("El usuario ya pertenece al proyecto.");
    }
    this._members.push(new ProjectMember(userId, role, joinedOnUtc));
    this._updatedOnUtc = joinedOnUtc;
  }

  removeMember(userId: UserId, updatedOnUtc: Date): void {
    if (userId === this._ownerId) {
      throw new DomainError("No se puede retirar al propietario del proyecto.");
    }
    const index = this._members.findIndex((member) => member.id === userId);
    if (index === -1) {
      throw new DomainError("El usuario no pertenece al proyecto.");
    }
    this._members.splice(index, 1);
    this._updatedOnUtc = updatedOnUtc;
  }

  hasMember(userId: UserId): boolean {
    return this._members.some((member) => member.id === userId);
  }
}
