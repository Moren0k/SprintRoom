import {
  GetProjectMemberDetailHandler,
  RemoveProjectMemberHandler,
} from "../../../../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../../../../src/server/application-scope";
import { handleRouteError, noContent, ok } from "../../../../../../src/server/http";
import { requireUuid } from "../../../../../../src/server/validation";

interface ProjectMemberRouteContext {
  readonly params: Promise<{ readonly projectId: string; readonly userId: string }>;
}

export async function GET(
  request: Request,
  context: ProjectMemberRouteContext,
): Promise<Response> {
  try {
    const params = await context.params;
    const projectId = requireUuid(params.projectId, "projectId");
    const userId = requireUuid(params.userId, "userId");
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new GetProjectMemberDetailHandler(
      scope.repositories.projects,
      scope.repositories.users,
      scope.repositories.userStories,
      scope.repositories.sprintTasks,
    ).handle({ requestContext: scope.requestContext, projectId, userId });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: ProjectMemberRouteContext,
): Promise<Response> {
  try {
    const params = await context.params;
    const projectId = requireUuid(params.projectId, "projectId");
    const userId = requireUuid(params.userId, "userId");
    const scope = await createAuthenticatedApplicationScope(request);
    await new RemoveProjectMemberHandler(
      scope.repositories.projects,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({ requestContext: scope.requestContext, projectId, userId });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "project.member_removed",
      entityType: "project",
      entityId: projectId,
      metadata: { userId },
    });
    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}
