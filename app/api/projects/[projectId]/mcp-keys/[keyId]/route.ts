import { createAuthenticatedApplicationScope } from "@/src/server/application-scope";
import { handleRouteError, noContent, readJsonObject } from "@/src/server/http";
import { requireString, requireUuid } from "@/src/server/validation";
import type { ProjectKeyRow, ProjectMemberRow } from "@/src/lib/insforge/schema";
import { fromProjectRoleCode } from "@/src/lib/insforge/schema";
import { SystemRole } from "@/src/domain/enums/system-role";
import { PermissionAction } from "@/src/domain/enums/permission-action";
import { AuthorizationPolicy } from "@/src/domain/policies/authorization-policy";

interface McpKeyRouteContext {
  readonly params: Promise<{ readonly projectId: string; readonly keyId: string }>;
}

async function requireProjectAccess(
  scope: Awaited<ReturnType<typeof createAuthenticatedApplicationScope>>,
  projectId: string,
): Promise<void> {
  const { createInsForgeDatabaseGateway } = await import("@/src/lib/insforge");
  const database = createInsForgeDatabaseGateway();

  const project = await database.selectOne<{ id: string }>("projects", [
    { operator: "eq", column: "id", value: projectId },
  ]);
  if (project === null) {
    throw new Error("El proyecto solicitado no existe.");
  }

  const isAdmin =
    scope.requestContext.systemRole === SystemRole.Administrator;
  if (isAdmin) return;

  const membership = await database.selectOne<ProjectMemberRow>(
    "project_members",
    [
      { operator: "eq", column: "project_id", value: projectId },
      { operator: "eq", column: "user_id", value: scope.requestContext.userId },
    ],
  );
  if (membership === null) {
    throw new Error("El usuario actual no pertenece a este proyecto.");
  }

  const role = fromProjectRoleCode(membership.role);
  if (!AuthorizationPolicy.canPerformProjectAction(role, PermissionAction.ManageMembers)) {
    throw new Error(
      "El usuario actual no tiene permisos suficientes para gestionar claves.",
    );
  }
}

export async function PATCH(
  request: Request,
  context: McpKeyRouteContext,
): Promise<Response> {
  try {
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const keyId = requireUuid((await context.params).keyId, "keyId");
    const scope = await createAuthenticatedApplicationScope(request);
    await requireProjectAccess(scope, projectId);

    const { createInsForgeDatabaseGateway } = await import("@/src/lib/insforge");
    const database = createInsForgeDatabaseGateway();

    const key = await database.selectOne<ProjectKeyRow>("project_keys", [
      { operator: "eq", column: "id", value: keyId },
      { operator: "eq", column: "project_id", value: projectId },
    ]);
    if (key === null) {
      throw new Error("La clave solicitada no existe o no pertenece a este proyecto.");
    }

    await database.upsertRows(
      "project_keys",
      [{ id: keyId, is_active: false }],
      { onConflict: "id" },
    );

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
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const keyId = requireUuid((await context.params).keyId, "keyId");
    const scope = await createAuthenticatedApplicationScope(request);
    await requireProjectAccess(scope, projectId);

    const body = await readJsonObject(request);
    const confirmationName = requireString(body, "confirmationName");

    const { createInsForgeDatabaseGateway } = await import("@/src/lib/insforge");
    const database = createInsForgeDatabaseGateway();

    const key = await database.selectOne<ProjectKeyRow>("project_keys", [
      { operator: "eq", column: "id", value: keyId },
      { operator: "eq", column: "project_id", value: projectId },
    ]);
    if (key === null) {
      throw new Error("La clave solicitada no existe o no pertenece a este proyecto.");
    }

    if (confirmationName !== key.description) {
      throw new Error("El nombre de confirmacion no coincide con la descripcion de la clave.");
    }

    await database.deleteRows("project_keys", [
      { operator: "eq", column: "id", value: keyId },
    ]);

    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "mcp_key.deleted",
      entityType: "project",
      entityId: projectId,
      metadata: { keyId, description: key.description },
    });

    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}
