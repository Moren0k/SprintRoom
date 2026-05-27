import { CreateAdministrativeUserHandler } from "../../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../../src/server/application-scope";
import { created, handleRouteError, readJsonObject } from "../../../../src/server/http";
import { parseSystemRole, requireString } from "../../../../src/server/validation";
import { createInsForgeServerClient } from "@/src/lib/insforge-server";
import { readPasswordPolicyError } from "@/src/lib/auth/password-policy";
import { assertAuthenticatedMutation } from "@/src/server/security";
import { ApplicationError } from "@/src/application";

export async function POST(request: Request): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    const currentPassword = requireString(body, "currentPassword");
    const targetPassword = requireString(body, "password");
    const passwordError = readPasswordPolicyError(targetPassword);
    if (passwordError !== null) {
      throw new ApplicationError(passwordError);
    }

    const currentUser = await scope.repositories.users.getById(scope.requestContext.userId);
    if (currentUser === null) {
      throw new ApplicationError("No se pudo resolver el administrador actual.");
    }

    const insforge = createInsForgeServerClient();
    const { error: reauthError } = await insforge.auth.signInWithPassword({
      email: currentUser.email.value,
      password: currentPassword,
    });
    if (reauthError !== null) {
      throw new ApplicationError("No fue posible reautenticar la accion administrativa.");
    }

    const result = await new CreateAdministrativeUserHandler(
      scope.repositories.users,
      scope.passwordHasher,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      fullName: requireString(body, "fullName"),
      email: requireString(body, "email"),
      password: targetPassword,
      systemRole: parseSystemRole(body.systemRole),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "user.admin_created",
      entityType: "user",
      entityId: result.userId,
      metadata: { systemRole: body.systemRole, privilegedAction: true },
    });
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
