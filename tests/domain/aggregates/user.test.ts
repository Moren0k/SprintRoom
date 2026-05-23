import { describe, expect, it } from "vitest";
import { User } from "../../../src/domain/aggregates/user";
import { AccountOrigin } from "../../../src/domain/enums/account-origin";
import { SystemRole } from "../../../src/domain/enums/system-role";
import { UserRegisteredDomainEvent } from "../../../src/domain/events/user-registered-domain-event";
import { EmailAddress } from "../../../src/domain/value-objects/email-address";
import { PersonName } from "../../../src/domain/value-objects/person-name";

describe("User aggregate", () => {
  it("registerPublic should require interactive login", () => {
    const user = User.registerPublic(
      PersonName.create("Jhos Agudelo"),
      EmailAddress.create("jhos@example.com"),
      "hash-1",
      new Date(),
    );

    expect(user.requiresInteractiveLogin).toBe(true);
    expect(user.origin).toBe(AccountOrigin.PublicRegistration);
    expect(
      user.domainEvents.some((e) => e instanceof UserRegisteredDomainEvent),
    ).toBe(true);
  });

  it("updateProfile should replace name and email", () => {
    const user = User.provisionByAdministrator(
      PersonName.create("Old Name"),
      EmailAddress.create("old@example.com"),
      "hash-1",
      SystemRole.Member,
      new Date(),
    );

    user.updateProfile(
      PersonName.create("New Name"),
      EmailAddress.create("new@example.com"),
      new Date(Date.now() + 600_000),
    );

    expect(user.fullName.value).toBe("New Name");
    expect(user.email.value).toBe("new@example.com");
  });
});
