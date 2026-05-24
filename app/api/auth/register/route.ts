import { createInsForgeServerClient } from "@/src/lib/insforge-server";
import { createApplicationScope } from "@/src/server/application-scope";
import { User } from "@/src/domain/aggregates/user";
import { EmailAddress } from "@/src/domain/value-objects/email-address";
import { PersonName } from "@/src/domain/value-objects/person-name";
import { ApplicationError } from "@/src/application";
import { created, handleRouteError, readJsonObject } from "@/src/server/http";
import { requireString } from "@/src/server/validation";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const fullName = requireString(body, "fullName").trim();
    const email = requireString(body, "email").trim();
    const password = requireString(body, "password");

    const existingByEmail = await createApplicationScope().repositories.users.getByEmail(email);
    if (existingByEmail !== null) {
      throw new ApplicationError("Ya existe un usuario registrado con ese correo.");
    }

    const insforge = createInsForgeServerClient();
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name: fullName,
    });

    if (error !== null || data === null) {
      throw new ApplicationError(error?.message ?? "No se pudo crear la cuenta.");
    }

    const scope = createApplicationScope();
    const newUser = User.registerPublic(
      PersonName.create(fullName),
      EmailAddress.create(email),
      `insforge:email:${data.user?.id ?? email}`,
      scope.clock.utcNow,
    );
    await scope.repositories.users.add(newUser);
    await scope.repositories.unitOfWork.saveChanges();

    return created({ userId: newUser.id, email, requiresRedirectToLogin: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
