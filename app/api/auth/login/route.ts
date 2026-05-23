import { LoginHandler } from "../../../../src/application";
import { UserId } from "../../../../src/domain/ids/user-id";
import { createSessionCookieValue } from "../../../../src/lib/auth";
import { createApplicationScope } from "../../../../src/server/application-scope";
import { handleRouteError, ok, readJsonObject } from "../../../../src/server/http";
import { requireString } from "../../../../src/server/validation";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const scope = createApplicationScope();
    const result = await new LoginHandler(
      scope.repositories.users,
      scope.passwordHasher,
      scope.sessionTokenFactory,
    ).handle({
      email: requireString(body, "email"),
      password: requireString(body, "password"),
    });
    await scope.auditLogger.record({
      actorId: UserId.from(result.userId),
      action: "auth.login",
      entityType: "user",
      entityId: result.userId,
      metadata: {},
    });
    const response = ok({
      userId: result.userId,
      email: result.email,
      requiresRedirectToLogin: result.requiresRedirectToLogin,
    });
    response.headers.set(
      "Set-Cookie",
      createSessionCookieValue(result.sessionToken, scope.env.sessionTokenTtlSeconds),
    );
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
