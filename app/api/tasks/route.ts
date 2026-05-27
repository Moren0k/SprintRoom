import {
  CreateSprintTaskHandler,
  ListPersonalTasksHandler,
  ListTasksByProjectHandler,
  ListTasksByUserStoryHandler,
} from "../../../src/application";
import { ApplicationError } from "../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../src/server/application-scope";
import { created, handleRouteError, ok, readJsonObject } from "../../../src/server/http";
import {
  optionalString,
  requireString,
  optionalUuidArray,
  requireUuid,
  requireUuidString,
} from "../../../src/server/validation";
import { assertAuthenticatedMutation } from "../../../src/server/security";

export async function GET(request: Request): Promise<Response> {
  try {
    const scope = await createAuthenticatedApplicationScope(request);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const userStoryId = url.searchParams.get("userStoryId");
    if (projectId !== null && userStoryId !== null) {
      throw new ApplicationError("Filtre tareas por proyecto o por historia, no ambos.");
    }
    if (projectId !== null) {
      const result = await new ListTasksByProjectHandler(
        scope.repositories.projects,
        scope.repositories.sprintTasks,
      ).handle({ requestContext: scope.requestContext, projectId: requireUuid(projectId, "projectId") });
      return ok(result);
    }
    if (userStoryId !== null) {
      const result = await new ListTasksByUserStoryHandler(
        scope.repositories.projects,
        scope.repositories.userStories,
        scope.repositories.sprintTasks,
      ).handle({ requestContext: scope.requestContext, userStoryId: requireUuid(userStoryId, "userStoryId") });
      return ok(result);
    }
    const result = await new ListPersonalTasksHandler(scope.repositories.sprintTasks).handle({
      requestContext: scope.requestContext,
    });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new CreateSprintTaskHandler(
      scope.repositories.projects,
      scope.repositories.users,
      scope.repositories.userStories,
      scope.repositories.sprintTasks,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      userStoryId: requireUuidString(body, "userStoryId"),
      title: requireString(body, "title"),
      description: optionalString(body, "description"),
      assigneeIds: optionalUuidArray(body, "assigneeIds"),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "task.created",
      entityType: "sprint_task",
      entityId: result.sprintTaskId,
      metadata: { projectId: result.projectId, userStoryId: result.userStoryId },
    });
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
