import { createAuthenticatedApplicationScope } from "@/src/server/application-scope";
import { handleRouteError, created, ok, readJsonObject } from "@/src/server/http";
import { requireString, requireUuid } from "@/src/server/validation";
import { BcryptProjectKeyHasher } from "@/src/lib/mcp/auth";
import { assertAuthenticatedMutation } from "@/src/server/security";
import {
  CreateProjectMcpKeyHandler,
  ListProjectMcpKeysHandler,
} from "@/src/application/features/project-keys";

interface McpKeysRouteContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

export async function GET(
  _request: Request,
  context: McpKeysRouteContext,
): Promise<Response> {
  try {
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const scope = await createAuthenticatedApplicationScope(_request);

    const handler = new ListProjectMcpKeysHandler(
      scope.repositories.projects,
      scope.repositories.projectKeys,
    );

    const keys = await handler.handle({
      requestContext: scope.requestContext,
      projectId,
    });

    return ok(keys);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  context: McpKeysRouteContext,
): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const scope = await createAuthenticatedApplicationScope(request);

    const body = await readJsonObject(request);
    const description = requireString(body, "description");

    const handler = new CreateProjectMcpKeyHandler(
      scope.repositories.projects,
      scope.repositories.projectKeys,
      new BcryptProjectKeyHasher(),
    );

    const result = await handler.handle({
      requestContext: scope.requestContext,
      projectId,
      description,
    });

    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "mcp_key.created",
      entityType: "project",
      entityId: projectId,
      metadata: { description },
    });

    return created({
      rawKey: result.rawKey,
      description: result.description,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
