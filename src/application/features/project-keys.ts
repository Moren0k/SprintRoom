import { randomBytes, randomUUID } from "node:crypto";
import { PermissionAction } from "../../domain/enums/permission-action";
import { ProjectId } from "../../domain/ids/project-id";
import { ApplicationError } from "../abstractions/application-error";
import type {
  KeyHasher,
  ProjectKeyRepository,
  ProjectRepository,
} from "../abstractions/ports";
import type { RequestContext } from "../abstractions/request-context";
import { ProjectAccess } from "./project-access";

const KEY_PREFIX = "sk_sprintroom_";

export interface ProjectKeyDto {
  readonly id: string;
  readonly description: string;
  readonly isActive: boolean;
  readonly createdOnUtc: string;
}

export interface CreatedProjectKeyDto extends ProjectKeyDto {
  readonly rawKey: string;
}

export interface ListProjectMcpKeysQuery {
  readonly requestContext: RequestContext;
  readonly projectId: string;
}

export class ListProjectMcpKeysHandler {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectKeyRepository: ProjectKeyRepository,
  ) {}

  async handle(query: ListProjectMcpKeysQuery): Promise<ReadonlyArray<ProjectKeyDto>> {
    await ProjectAccess.loadProjectForVisibility(
      this.projectRepository,
      query.requestContext,
      ProjectId.from(query.projectId),
    );

    const keys = await this.projectKeyRepository.listByProject(query.projectId);
    return keys.map((k) => ({
      id: k.id,
      description: k.description,
      isActive: k.isActive,
      createdOnUtc: k.createdOnUtc,
    }));
  }
}

export interface CreateProjectMcpKeyCommand {
  readonly requestContext: RequestContext;
  readonly projectId: string;
  readonly description: string;
}

export class CreateProjectMcpKeyHandler {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectKeyRepository: ProjectKeyRepository,
    private readonly keyHasher: KeyHasher,
  ) {}

  async handle(command: CreateProjectMcpKeyCommand): Promise<CreatedProjectKeyDto> {
    await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      ProjectId.from(command.projectId),
      PermissionAction.ManageMembers,
    );

    const now = new Date().toISOString();
    const keyId = randomUUID();
    const rawKey = KEY_PREFIX + randomBytes(24).toString("hex");
    const keyFingerprint = this.keyHasher.fingerprint(rawKey);
    const keyHash = this.keyHasher.hash(rawKey);

    await this.projectKeyRepository.add({
      id: keyId,
      projectId: command.projectId,
      keyFingerprint,
      keyHash,
      description: command.description,
      isActive: true,
      createdOnUtc: now,
    });

    return {
      id: keyId,
      rawKey,
      description: command.description,
      isActive: true,
      createdOnUtc: now,
    };
  }
}

export interface DeactivateProjectMcpKeyCommand {
  readonly requestContext: RequestContext;
  readonly projectId: string;
  readonly keyId: string;
}

export class DeactivateProjectMcpKeyHandler {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectKeyRepository: ProjectKeyRepository,
  ) {}

  async handle(command: DeactivateProjectMcpKeyCommand): Promise<void> {
    await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      ProjectId.from(command.projectId),
      PermissionAction.ManageMembers,
    );

    const key = await this.projectKeyRepository.getByIdAndProject(
      command.keyId,
      command.projectId,
    );
    if (key === null) {
      throw new ApplicationError("La clave solicitada no existe o no pertenece a este proyecto.");
    }

    await this.projectKeyRepository.deactivate(command.keyId);
  }
}

export interface DeleteProjectMcpKeyCommand {
  readonly requestContext: RequestContext;
  readonly projectId: string;
  readonly keyId: string;
  readonly confirmationName: string;
}

export class DeleteProjectMcpKeyHandler {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectKeyRepository: ProjectKeyRepository,
  ) {}

  async handle(command: DeleteProjectMcpKeyCommand): Promise<void> {
    await ProjectAccess.loadProjectForAction(
      this.projectRepository,
      command.requestContext,
      ProjectId.from(command.projectId),
      PermissionAction.ManageMembers,
    );

    const key = await this.projectKeyRepository.getByIdAndProject(
      command.keyId,
      command.projectId,
    );
    if (key === null) {
      throw new ApplicationError("La clave solicitada no existe o no pertenece a este proyecto.");
    }

    if (command.confirmationName !== key.description) {
      throw new ApplicationError("El nombre de confirmacion no coincide con la descripcion de la clave.");
    }

    await this.projectKeyRepository.delete(command.keyId);
  }
}
