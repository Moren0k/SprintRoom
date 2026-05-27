import {
  DeleteProjectHandler,
  GetProjectDetailHandler,
  UpdateProjectDocumentationHandler,
} from "../../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../../src/server/application-scope";
import { handleRouteError, noContent, ok, readJsonObject } from "../../../../src/server/http";
import { optionalString, requireString, requireUuid } from "../../../../src/server/validation";
import { assertAuthenticatedMutation } from "../../../../src/server/security";

interface ProjectRouteContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

export async function GET(request: Request, context: ProjectRouteContext): Promise<Response> {
  try {
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new GetProjectDetailHandler(
      scope.repositories.projects,
      scope.repositories.users,
      scope.repositories.userStories,
      scope.repositories.sprintTasks,
    ).handle({ requestContext: scope.requestContext, projectId });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: ProjectRouteContext): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    const result = await new UpdateProjectDocumentationHandler(
      scope.repositories.projects,
      scope.repositories.users,
      scope.repositories.userStories,
      scope.repositories.sprintTasks,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      projectId,
      name: requireString(body, "name"),
      description: optionalString(body, "description"),
      externalReference: optionalString(body, "externalReference"),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "project.updated",
      entityType: "project",
      entityId: projectId,
      metadata: {},
    });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, context: ProjectRouteContext): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const projectId = requireUuid((await context.params).projectId, "projectId");
    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);
    await new DeleteProjectHandler(
      scope.repositories.projects,
      scope.repositories.userStories,
      scope.repositories.sprintTasks,
      scope.repositories.unitOfWork,
    ).handle({
      requestContext: scope.requestContext,
      projectId,
      confirmationName: requireString(body, "confirmationName"),
      destructiveConfirmation: requireString(body, "destructiveConfirmation"),
    });
    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "project.deleted",
      entityType: "project",
      entityId: projectId,
      metadata: {},
    });
    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}
