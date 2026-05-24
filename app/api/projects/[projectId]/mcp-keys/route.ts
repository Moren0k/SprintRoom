import { createHash, randomBytes } from "node:crypto";
import { createAuthenticatedApplicationScope } from "@/src/server/application-scope";
import { handleRouteError, created, ok, readJsonObject } from "@/src/server/http";
import { requireString, requireUuid } from "@/src/server/validation";
import type { ProjectKeyRow, ProjectMemberRow } from "@/src/lib/insforge/schema";
import { fromProjectRoleCode } from "@/src/lib/insforge/schema";
import { SystemRole } from "@/src/domain/enums/system-role";
import { PermissionAction } from "@/src/domain/enums/permission-action";
import { AuthorizationPolicy } from "@/src/domain/policies/authorization-policy";

interface McpKeysRouteContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

const KEY_PREFIX = "sk_sprintroom_";

async function requireProjectMembership(
  scope: Awaited<ReturnType<typeof createAuthenticatedApplicationScope>>,
  projectId: string,
  action?: PermissionAction,
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
  if (isAdmin) return; // Admins bypass membership checks

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

  if (action !== undefined) {
    const role = fromProjectRoleCode(membership.role);
    if (!AuthorizationPolicy.canPerformProjectAction(role, action)) {
      throw new Error(
        "El usuario actual no tiene permisos suficientes para esta accion.",
      );
    }
  }
}

export async function GET(
  _request: Request,
  context: McpKeysRouteContext,
): Promise<Response> {
  try {
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const scope = await createAuthenticatedApplicationScope(_request);
    await requireProjectMembership(scope, projectId);

    const { createInsForgeDatabaseGateway } = await import("@/src/lib/insforge");
    const database = createInsForgeDatabaseGateway();
    const rows = await database.selectRows<ProjectKeyRow>("project_keys", {
      filters: [{ operator: "eq", column: "project_id", value: projectId }],
      orderBy: { column: "created_on_utc", ascending: false },
    });
    return ok(
      rows.map((row) => ({
        id: row.id,
        description: row.description,
        isActive: row.is_active,
        createdOnUtc: row.created_on_utc,
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  context: McpKeysRouteContext,
): Promise<Response> {
  try {
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const scope = await createAuthenticatedApplicationScope(request);
    await requireProjectMembership(scope, projectId, PermissionAction.ManageMembers);

    const body = await readJsonObject(request);
    const description = requireString(body, "description");

    const rawKey = KEY_PREFIX + randomBytes(24).toString("hex");
    const keyHash = createHash("sha256").update(rawKey, "utf-8").digest("hex");

    const { createInsForgeDatabaseGateway } = await import("@/src/lib/insforge");
    const database = createInsForgeDatabaseGateway();

    await database.insertRows("project_keys", [
      {
        project_id: projectId,
        key_hash: keyHash,
        description,
        is_active: true,
        created_on_utc: new Date().toISOString(),
      },
    ]);

    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "mcp_key.created",
      entityType: "project",
      entityId: projectId,
      metadata: { description },
    });

    return created({
      rawKey,
      description,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
