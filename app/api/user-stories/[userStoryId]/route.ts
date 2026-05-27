import { DeleteUserStoryHandler, GetUserStoryDetailHandler } from "../../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../../src/server/application-scope";
import { handleRouteError, noContent, ok, readJsonObject } from "../../../../src/server/http";
import { requireString, requireUuid } from "../../../../src/server/validation";
import { assertAuthenticatedMutation } from "../../../../src/server/security";

interface UserStoryRouteContext {
  readonly params: Promise<{ readonly userStoryId: string }>;
}

export async function GET(request: Request, context: UserStoryRouteContext): Promise<Response> {
  try {
    const userStoryId = requireUuid((await context.params).userStoryId, "userStoryId");
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new GetUserStoryDetailHandler(
      scope.repositories.projects,
      scope.repositories.userStories,
      scope.repositories.sprintTasks,
    ).handle({ requestContext: scope.requestContext, userStoryId });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, context: UserStoryRouteContext): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const userStoryId = requireUuid((await context.params).userStoryId, "userStoryId");
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    await new DeleteUserStoryHandler(
      scope.repositories.projects,
      scope.repositories.userStories,
      scope.repositories.sprintTasks,
      scope.repositories.unitOfWork,
    ).handle({
      requestContext: scope.requestContext,
      userStoryId,
      confirmationName: requireString(body, "confirmationName"),
      destructiveConfirmation: requireString(body, "destructiveConfirmation"),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "user_story.deleted",
      entityType: "user_story",
      entityId: userStoryId,
      metadata: {},
    });
    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}
