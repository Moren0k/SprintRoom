import { Entity } from "../abstractions/entity";
import { type ProjectRole } from "../enums/project-role";
import type { UserId } from "../ids/user-id";

export class ProjectMember extends Entity<UserId> {
  private _role: ProjectRole;
  readonly joinedOnUtc: Date;

  constructor(userId: UserId, role: ProjectRole, joinedOnUtc: Date) {
    super(userId);
    this._role = role;
    this.joinedOnUtc = joinedOnUtc;
  }

  get role(): ProjectRole {
    return this._role;
  }

  changeRole(role: ProjectRole): void {
    this._role = role;
  }
}
