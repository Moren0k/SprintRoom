import { AggregateRoot } from "../abstractions/aggregate-root";
import { AccountOrigin } from "../enums/account-origin";
import { SystemRole } from "../enums/system-role";
import { UserRegisteredDomainEvent } from "../events/user-registered-domain-event";
import { UserId } from "../ids/user-id";
import type { EmailAddress } from "../value-objects/email-address";
import type { PersonName } from "../value-objects/person-name";

function normalizeHash(passwordHash: string | null | undefined): string {
  if (
    passwordHash === null ||
    passwordHash === undefined ||
    passwordHash.trim().length === 0
  ) {
    throw new TypeError("El hash de credencial es obligatorio.");
  }
  return passwordHash.trim();
}

export class User extends AggregateRoot<UserId> {
  private _fullName: PersonName;
  private _email: EmailAddress;
  private _passwordHash: string;
  private _systemRole: SystemRole;
  private readonly _origin: AccountOrigin;
  private readonly _createdOnUtc: Date;
  private _updatedOnUtc: Date;

  private constructor(
    id: UserId,
    fullName: PersonName,
    email: EmailAddress,
    passwordHash: string,
    systemRole: SystemRole,
    origin: AccountOrigin,
    createdOnUtc: Date,
  ) {
    super(id);
    this._fullName = fullName;
    this._email = email;
    this._passwordHash = passwordHash;
    this._systemRole = systemRole;
    this._origin = origin;
    this._createdOnUtc = createdOnUtc;
    this._updatedOnUtc = createdOnUtc;
  }

  get fullName(): PersonName {
    return this._fullName;
  }
  get email(): EmailAddress {
    return this._email;
  }
  get passwordHash(): string {
    return this._passwordHash;
  }
  get systemRole(): SystemRole {
    return this._systemRole;
  }
  get origin(): AccountOrigin {
    return this._origin;
  }
  get createdOnUtc(): Date {
    return this._createdOnUtc;
  }
  get updatedOnUtc(): Date {
    return this._updatedOnUtc;
  }

  get requiresInteractiveLogin(): boolean {
    return this._origin === AccountOrigin.PublicRegistration;
  }

  static registerPublic(
    fullName: PersonName,
    email: EmailAddress,
    passwordHash: string,
    createdOnUtc: Date,
  ): User {
    const user = new User(
      UserId.new(),
      fullName,
      email,
      normalizeHash(passwordHash),
      SystemRole.Member,
      AccountOrigin.PublicRegistration,
      createdOnUtc,
    );
    user.raise(new UserRegisteredDomainEvent(user.id, createdOnUtc));
    return user;
  }

  static provisionByAdministrator(
    fullName: PersonName,
    email: EmailAddress,
    passwordHash: string,
    systemRole: SystemRole,
    createdOnUtc: Date,
  ): User {
    const user = new User(
      UserId.new(),
      fullName,
      email,
      normalizeHash(passwordHash),
      systemRole,
      AccountOrigin.AdministrativeProvisioning,
      createdOnUtc,
    );
    user.raise(new UserRegisteredDomainEvent(user.id, createdOnUtc));
    return user;
  }

  static registerGoogleOAuth(
    id: UserId,
    fullName: PersonName,
    email: EmailAddress,
    passwordHash: string,
    createdOnUtc: Date,
  ): User {
    const user = new User(
      id,
      fullName,
      email,
      normalizeHash(passwordHash),
      SystemRole.Member,
      AccountOrigin.GoogleOAuth,
      createdOnUtc,
    );
    user.raise(new UserRegisteredDomainEvent(user.id, createdOnUtc));
    return user;
  }

  static rehydrate(
    id: UserId,
    fullName: PersonName,
    email: EmailAddress,
    passwordHash: string,
    systemRole: SystemRole,
    origin: AccountOrigin,
    createdOnUtc: Date,
    updatedOnUtc: Date,
  ): User {
    const user = new User(
      id,
      fullName,
      email,
      normalizeHash(passwordHash),
      systemRole,
      origin,
      createdOnUtc,
    );
    user._updatedOnUtc = updatedOnUtc;
    return user;
  }

  updateProfile(fullName: PersonName, email: EmailAddress, updatedOnUtc: Date): void {
    this._fullName = fullName;
    this._email = email;
    this._updatedOnUtc = updatedOnUtc;
  }

  rotatePassword(passwordHash: string, updatedOnUtc: Date): void {
    this._passwordHash = normalizeHash(passwordHash);
    this._updatedOnUtc = updatedOnUtc;
  }
}
