import type { Project } from "../../domain/aggregates/project";
import type { PermissionAction } from "../../domain/enums/permission-action";
import { SystemRole } from "../../domain/enums/system-role";
import type { ProjectId } from "../../domain/ids/project-id";
import { AuthorizationPolicy } from "../../domain/policies/authorization-policy";
import { VisibilityPolicy } from "../../domain/policies/visibility-policy";
import { ApplicationError } from "../abstractions/application-error";
import type { ProjectRepository } from "../abstractions/ports";
import type { RequestContext } from "../abstractions/request-context";

/**
 * Helpers compartidos para cargar un proyecto aplicando reglas de
 * visibilidad y autorizacion.
 */
export const ProjectAccess = {
  async loadProjectForVisibility(
    projectRepository: ProjectRepository,
    executionContext: RequestContext,
    projectId: ProjectId,
  ): Promise<Project> {
    const project = await projectRepository.getById(projectId);
    if (project === null) {
      throw new ApplicationError("El proyecto solicitado no existe.");
    }
    if (
      !VisibilityPolicy.canViewProjectDetails(
        executionContext.systemRole,
        project.hasMember(executionContext.userId),
      )
    ) {
      throw new ApplicationError(
        "El usuario actual no puede consultar este proyecto.",
      );
    }
    return project;
  },

  async loadProjectForAction(
    projectRepository: ProjectRepository,
    executionContext: RequestContext,
    projectId: ProjectId,
    action: PermissionAction,
  ): Promise<Project> {
    const project = await ProjectAccess.loadProjectForVisibility(
      projectRepository,
      executionContext,
      projectId,
    );
    if (executionContext.systemRole === SystemRole.Administrator) {
      return project;
    }
    const membership = project.members.find(
      (member) => member.id === executionContext.userId,
    );
    if (membership === undefined) {
      throw new ApplicationError(
        "El usuario actual no pertenece a este proyecto.",
      );
    }
    if (!AuthorizationPolicy.canPerformProjectAction(membership.role, action)) {
      throw new ApplicationError(
        "El usuario actual no tiene permisos suficientes para esta accion.",
      );
    }
    return project;
  },
} as const;
