import {
  GetCurrentUserProfileHandler,
  UpdateCurrentUserProfileHandler,
} from "../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../src/server/application-scope";
import { handleRouteError, ok, readJsonObject } from "../../../src/server/http";
import { requireString } from "../../../src/server/validation";
import { assertAuthenticatedMutation } from "../../../src/server/security";

export async function GET(request: Request): Promise<Response> {
  try {
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new GetCurrentUserProfileHandler(scope.repositories.users).handle({
      requestContext: scope.requestContext,
    });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new UpdateCurrentUserProfileHandler(
      scope.repositories.users,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      fullName: requireString(body, "fullName"),
      email: requireString(body, "email"),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "user.profile_updated",
      entityType: "user",
      entityId: result.userId,
      metadata: {},
    });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
