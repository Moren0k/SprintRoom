import { RegisterPublicUserHandler } from "../../../../src/application";
import { createApplicationScope } from "../../../../src/server/application-scope";
import { created, handleRouteError, readJsonObject } from "../../../../src/server/http";
import { requireString } from "../../../../src/server/validation";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const scope = createApplicationScope();
    const result = await new RegisterPublicUserHandler(
      scope.repositories.users,
      scope.passwordHasher,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      fullName: requireString(body, "fullName"),
      email: requireString(body, "email"),
      password: requireString(body, "password"),
    });
    await scope.auditLogger.record({
      actorId: null,
      action: "user.registered",
      entityType: "user",
      entityId: result.userId,
      metadata: { origin: "public" },
    });
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
