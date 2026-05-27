import { createAuthenticatedApplicationScope } from "@/src/server/application-scope";
import { handleRouteError, noContent, readJsonObject } from "@/src/server/http";
import { requireString, requireUuid } from "@/src/server/validation";
import { assertAuthenticatedMutation } from "@/src/server/security";
import {
  DeactivateProjectMcpKeyHandler,
  DeleteProjectMcpKeyHandler,
} from "@/src/application/features/project-keys";

interface McpKeyRouteContext {
  readonly params: Promise<{ readonly projectId: string; readonly keyId: string }>;
}

export async function PATCH(
  request: Request,
  context: McpKeyRouteContext,
): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const keyId = requireUuid((await context.params).keyId, "keyId");
    const scope = await createAuthenticatedApplicationScope(request);

    const handler = new DeactivateProjectMcpKeyHandler(
      scope.repositories.projects,
      scope.repositories.projectKeys,
    );

    await handler.handle({
      requestContext: scope.requestContext,
      projectId,
      keyId,
    });

    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "mcp_key.deactivated",
      entityType: "project",
      entityId: projectId,
      metadata: { keyId },
    });

    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: McpKeyRouteContext,
): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const keyId = requireUuid((await context.params).keyId, "keyId");
    const scope = await createAuthenticatedApplicationScope(request);

    const body = await readJsonObject(request);
    const confirmationName = requireString(body, "confirmationName");

    const handler = new DeleteProjectMcpKeyHandler(
      scope.repositories.projects,
      scope.repositories.projectKeys,
    );

    await handler.handle({
      requestContext: scope.requestContext,
      projectId,
      keyId,
      confirmationName,
    });

    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "mcp_key.deleted",
      entityType: "project",
      entityId: projectId,
      metadata: { keyId, description: confirmationName },
    });

    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}
