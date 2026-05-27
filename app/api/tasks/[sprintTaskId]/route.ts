import { DeleteSprintTaskHandler, GetSprintTaskDetailHandler, UpdateTaskStatusHandler } from "../../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../../src/server/application-scope";
import { handleRouteError, noContent, ok, readJsonObject } from "../../../../src/server/http";
import { requireString, requireUuid } from "../../../../src/server/validation";
import { assertAuthenticatedMutation } from "../../../../src/server/security";

interface SprintTaskRouteContext {
  readonly params: Promise<{ readonly sprintTaskId: string }>;
}

export async function GET(request: Request, context: SprintTaskRouteContext): Promise<Response> {
  try {
    const sprintTaskId = requireUuid((await context.params).sprintTaskId, "sprintTaskId");
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new GetSprintTaskDetailHandler(
      scope.repositories.projects,
      scope.repositories.sprintTasks,
    ).handle({ requestContext: scope.requestContext, sprintTaskId });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, context: SprintTaskRouteContext): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const sprintTaskId = requireUuid((await context.params).sprintTaskId, "sprintTaskId");
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    await new DeleteSprintTaskHandler(
      scope.repositories.projects,
      scope.repositories.sprintTasks,
      scope.repositories.unitOfWork,
    ).handle({
      requestContext: scope.requestContext,
      sprintTaskId,
      confirmationName: requireString(body, "confirmationName"),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "task.deleted",
      entityType: "sprint_task",
      entityId: sprintTaskId,
      metadata: { commentsRetained: true },
    });
    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: SprintTaskRouteContext): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const sprintTaskId = requireUuid((await context.params).sprintTaskId, "sprintTaskId");
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new UpdateTaskStatusHandler(
      scope.repositories.projects,
      scope.repositories.sprintTasks,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      sprintTaskId,
      status: requireString(body, "status"),
    });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
