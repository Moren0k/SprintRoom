import { PlanProjectFromIdeaHandler } from "../../../../src/application";
import { createAuthenticatedApplicationScope } from "../../../../src/server/application-scope";
import { created, handleRouteError, readJsonObject } from "../../../../src/server/http";
import { requireString } from "../../../../src/server/validation";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "../../../../src/server/rate-limit";
import { assertAuthenticatedMutation } from "../../../../src/server/security";

interface PlannedTaskInput {
  title: string;
  description: string;
}

interface PlannedUserStoryInput {
  title: string;
  description: string;
  tasks: PlannedTaskInput[];
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const ip = getClientIp(request);
    const ipLimit = await checkRateLimit("imagine", ip);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetMs);

    const body = await readJsonObject(request);
    const scope = await createAuthenticatedApplicationScope(request);

    const userStories = body.userStories;
    if (!Array.isArray(userStories) || userStories.length === 0) {
      return handleRouteError(
        new Error("El plan debe incluir al menos una historia de usuario."),
      );
    }

    const stories: PlannedUserStoryInput[] = userStories.map((story: unknown) => {
      const s = story as Record<string, unknown>;
      const tasks = s.tasks;
      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error(`La historia "${s.title}" debe incluir al menos una tarea.`);
      }
      return {
        title: String(s.title ?? ""),
        description: String(s.description ?? ""),
        tasks: tasks.map((task: unknown) => {
          const t = task as Record<string, unknown>;
          return {
            title: String(t.title ?? ""),
            description: String(t.description ?? ""),
          };
        }),
      };
    });

    const result = await new PlanProjectFromIdeaHandler(
      scope.repositories.projects,
      scope.repositories.users,
      scope.repositories.userStories,
      scope.repositories.sprintTasks,
      scope.repositories.unitOfWork,
      scope.clock,
    ).handle({
      requestContext: scope.requestContext,
      projectName: requireString(body, "projectName"),
      description: requireString(body, "description"),
      externalReference: "",
      userStories: stories,
    });

    await scope.auditLogger.record({
      actorId: scope.requestContext.userId,
      action: "project.created_from_idea",
      entityType: "project",
      entityId: result.projectId,
      metadata: {
        userStoryCount: result.userStoryCount,
        taskCount: result.taskCount,
      },
    });

    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
