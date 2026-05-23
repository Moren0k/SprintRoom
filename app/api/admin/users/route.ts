import { CreateAdministrativeUserHandler } from "../../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../../src/server/application-scope";
import { created, handleRouteError, readJsonObject } from "../../../../src/server/http";
import { parseSystemRole, requireString } from "../../../../src/server/validation";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new CreateAdministrativeUserHandler(
      scope.repositories.users,
      scope.passwordHasher,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      fullName: requireString(body, "fullName"),
      email: requireString(body, "email"),
      password: requireString(body, "password"),
      systemRole: parseSystemRole(body.systemRole),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "user.admin_created",
      entityType: "user",
      entityId: result.userId,
      metadata: { systemRole: body.systemRole },
    });
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
