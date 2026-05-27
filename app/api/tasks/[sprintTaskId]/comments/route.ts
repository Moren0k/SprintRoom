import { AddTaskCommentHandler } from "../../../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../../../src/server/application-scope";
import { created, handleRouteError, readJsonObject } from "../../../../../src/server/http";
import { requireString, requireUuid } from "../../../../../src/server/validation";
import { assertAuthenticatedMutation } from "../../../../../src/server/security";

interface SprintTaskCommentsRouteContext {
  readonly params: Promise<{ readonly sprintTaskId: string }>;
}

export async function POST(
  request: Request,
  context: SprintTaskCommentsRouteContext,
): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const sprintTaskId = requireUuid((await context.params).sprintTaskId, "sprintTaskId");
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new AddTaskCommentHandler(
      scope.repositories.projects,
      scope.repositories.sprintTasks,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      sprintTaskId,
      body: requireString(body, "body"),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "task.comment_added",
      entityType: "sprint_task",
      entityId: sprintTaskId,
      metadata: { commentId: result.commentId },
    });
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
