import { createAuthenticatedApplicationScope } from "@/src/server/application-scope";
import { handleRouteError, ok } from "@/src/server/http";
import { getAccessTokenFromCookies } from "@/src/lib/insforge-cookies";

export async function GET(request: Request): Promise<Response> {
  try {
    const scope = await createAuthenticatedApplicationScope(request);
    const accessToken =
      scope.refreshedSessionTokens?.accessToken ??
      getAccessTokenFromCookies(request.headers.get("cookie")) ??
      "";

    return ok({
      userId: scope.requestContext.userId,
      accessToken,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
