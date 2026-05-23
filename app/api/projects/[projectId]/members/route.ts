import { AddProjectMemberHandler } from "../../../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../../../src/server/application-scope";
import { created, handleRouteError, readJsonObject } from "../../../../../src/server/http";
import { parseProjectRole, requireUuid, requireUuidString } from "../../../../../src/server/validation";

interface ProjectMembersRouteContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

export async function POST(
  request: Request,
  context: ProjectMembersRouteContext,
): Promise<Response> {
  try {
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new AddProjectMemberHandler(
      scope.repositories.projects,
      scope.repositories.users,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      projectId,
      userId: requireUuidString(body, "userId"),
      projectRole: parseProjectRole(body.projectRole),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "project.member_added",
      entityType: "project",
      entityId: projectId,
      metadata: { userId: result.userId, projectRole: result.projectRole },
    });
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
