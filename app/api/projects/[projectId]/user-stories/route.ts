import {
  CreateUserStoryHandler,
  ListUserStoriesByProjectHandler,
} from "../../../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../../../src/server/application-scope";
import { created, handleRouteError, ok, readJsonObject } from "../../../../../src/server/http";
import { optionalString, requireString, requireUuid } from "../../../../../src/server/validation";

interface ProjectUserStoriesRouteContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

export async function GET(
  request: Request,
  context: ProjectUserStoriesRouteContext,
): Promise<Response> {
  try {
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new ListUserStoriesByProjectHandler(
      scope.repositories.projects,
      scope.repositories.userStories,
      scope.repositories.sprintTasks,
    ).handle({ requestContext: scope.requestContext, projectId });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  context: ProjectUserStoriesRouteContext,
): Promise<Response> {
  try {
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new CreateUserStoryHandler(
      scope.repositories.projects,
      scope.repositories.userStories,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      projectId,
      title: requireString(body, "title"),
      description: optionalString(body, "description"),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "user_story.created",
      entityType: "user_story",
      entityId: result.userStoryId,
      metadata: { projectId },
    });
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
