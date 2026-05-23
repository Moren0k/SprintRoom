import { User } from "../../../src/domain/aggregates/user";
import { SystemRole } from "../../../src/domain/enums/system-role";
import { EmailAddress } from "../../../src/domain/value-objects/email-address";
import { PersonName } from "../../../src/domain/value-objects/person-name";

/**
 * Datos de prueba reutilizables. Equivalente al `TestData` de la
 * implementacion C# previa.
 */
export const TestData = {
  createUser(
    fullName = "User",
    email = "user@example.com",
    systemRole: SystemRole = SystemRole.Member,
  ): User {
    return User.provisionByAdministrator(
      PersonName.create(fullName),
      EmailAddress.create(email),
      "hash::secret",
      systemRole,
      new Date(),
    );
  },
};
