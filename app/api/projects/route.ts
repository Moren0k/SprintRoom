import { CreateProjectHandler, ListProjectsHandler } from "../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../src/server/application-scope";
import { created, handleRouteError, ok, readJsonObject } from "../../../src/server/http";
import {
  optionalInitialMembers,
  optionalString,
  requireString,
} from "../../../src/server/validation";

export async function GET(request: Request): Promise<Response> {
  try {
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new ListProjectsHandler(
      scope.repositories.projects,
      scope.repositories.userStories,
      scope.repositories.sprintTasks,
    ).handle({ requestContext: scope.requestContext });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new CreateProjectHandler(
      scope.repositories.projects,
      scope.repositories.users,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      name: requireString(body, "name"),
      description: optionalString(body, "description"),
      externalReference: optionalString(body, "externalReference"),
      initialMembers: optionalInitialMembers(body),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "project.created",
      entityType: "project",
      entityId: result.projectId,
      metadata: { memberCount: result.members.length },
    });
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
