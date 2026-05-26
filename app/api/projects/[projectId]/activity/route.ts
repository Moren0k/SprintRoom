import { ListProjectActivityHandler } from "../../../../../src/application/features/projects";
import { createAuthenticatedApplicationScope } from "../../../../../src/server/application-scope";
import { handleRouteError, ok } from "../../../../../src/server/http";
import { requireUuid } from "../../../../../src/server/validation";

interface ActivityRouteContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

export async function GET(
  request: Request,
  context: ActivityRouteContext,
): Promise<Response> {
  try {
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam !== null ? Math.min(50, Math.max(1, Number(limitParam) || 20)) : undefined;

    const scope = await createAuthenticatedApplicationScope(request);

    const result = await new ListProjectActivityHandler(
      scope.repositories.projects,
      scope.repositories.auditEvents,
    ).handle({
      requestContext: scope.requestContext,
      projectId,
      limit,
    });

    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
