import { describe, expect, it } from "vitest";
import { Project } from "../../../src/domain/aggregates/project";
import { ProjectRole } from "../../../src/domain/enums/project-role";
import { SystemRole } from "../../../src/domain/enums/system-role";
import { Description } from "../../../src/domain/value-objects/description";
import { ExternalReference } from "../../../src/domain/value-objects/external-reference";
import { ProjectName } from "../../../src/domain/value-objects/project-name";
import { UserId } from "../../../src/domain/ids/user-id";
import { ApplicationError } from "../../../src/application/abstractions/application-error";
import {
  ListProjectMcpKeysHandler,
  CreateProjectMcpKeyHandler,
  DeactivateProjectMcpKeyHandler,
  DeleteProjectMcpKeyHandler,
} from "../../../src/application/features/project-keys";
import type { RequestContext } from "../../../src/application/abstractions/request-context";
import {
  FakeKeyHasher,
  InMemoryProjectRepository,
  InMemoryProjectKeyRepository,
} from "../support/fakes";
import { TestData } from "../support/test-data";

function ownerContext(ownerId: string): RequestContext {
  return { userId: UserId.from(ownerId), systemRole: SystemRole.Administrator };
}

function memberContext(userId: string): RequestContext {
  return { userId: UserId.from(userId), systemRole: SystemRole.Member };
}

describe("ProjectKeys", () => {
  describe("ListProjectMcpKeysHandler", () => {
    it("should list keys for authorized user", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      await projects.add(project);

      projectKeys.keys.push({
        id: "key-1",
        projectId: project.id,
        keyFingerprint: "fingerprint-1",
        keyHash: "hash-1",
        description: "Key 1",
        isActive: true,
        createdOnUtc: "2026-01-01T00:00:00.000Z",
      });

      const handler = new ListProjectMcpKeysHandler(projects, projectKeys);
      const result = await handler.handle({
        requestContext: ownerContext(owner.id),
        projectId: project.id,
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("key-1");
      expect(result[0].description).toBe("Key 1");
      expect(result[0].isActive).toBe(true);
    });

    it("should not include keyHash in listed keys", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      await projects.add(project);

      projectKeys.keys.push({
        id: "key-1",
        projectId: project.id,
        keyFingerprint: "fingerprint-1",
        keyHash: "secret-hash",
        description: "Key 1",
        isActive: true,
        createdOnUtc: "2026-01-01T00:00:00.000Z",
      });

      const handler = new ListProjectMcpKeysHandler(projects, projectKeys);
      const result = await handler.handle({
        requestContext: ownerContext(owner.id),
        projectId: project.id,
      });

      expect(result.length).toBe(1);
      expect((result[0] as unknown as Record<string, unknown>).keyHash).toBeUndefined();
    });

    it("should reject listing for non-member", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const stranger = TestData.createUser("Stranger", "stranger@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      await projects.add(project);

      const handler = new ListProjectMcpKeysHandler(projects, projectKeys);

      await expect(
        handler.handle({
          requestContext: memberContext(stranger.id),
          projectId: project.id,
        }),
      ).rejects.toThrow(ApplicationError);
    });
  });

  describe("CreateProjectMcpKeyHandler", () => {
    it("should create key and return rawKey for owner", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      await projects.add(project);

      const handler = new CreateProjectMcpKeyHandler(
        projects,
        projectKeys,
        new FakeKeyHasher(),
      );

      const result = await handler.handle({
        requestContext: memberContext(owner.id),
        projectId: project.id,
        description: "My key",
      });

      expect(result.rawKey).toBeTruthy();
      expect(result.rawKey.startsWith("sk_sprintroom_")).toBe(true);
      expect(result.description).toBe("My key");
      expect(result.isActive).toBe(true);

      expect(projectKeys.keys.length).toBe(1);
      expect(projectKeys.keys[0].description).toBe("My key");
      expect(projectKeys.keys[0].keyFingerprint).toBe("fingerprint::" + result.rawKey);
      expect(projectKeys.keys[0].keyHash).toBe("hash::" + result.rawKey);
    });

    it("should reject creation by viewer", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const viewer = TestData.createUser("Viewer", "viewer@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      project.addMember(viewer.id, ProjectRole.Viewer, new Date());
      await projects.add(project);

      const handler = new CreateProjectMcpKeyHandler(
        projects,
        projectKeys,
        new FakeKeyHasher(),
      );

      await expect(
        handler.handle({
          requestContext: memberContext(viewer.id),
          projectId: project.id,
          description: "Should fail",
        }),
      ).rejects.toThrow(ApplicationError);

      expect(projectKeys.keys.length).toBe(0);
    });

    it("should reject creation by non-member", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const stranger = TestData.createUser("Stranger", "stranger@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      await projects.add(project);

      const handler = new CreateProjectMcpKeyHandler(
        projects,
        projectKeys,
        new FakeKeyHasher(),
      );

      await expect(
        handler.handle({
          requestContext: memberContext(stranger.id),
          projectId: project.id,
          description: "Should fail",
        }),
      ).rejects.toThrow(ApplicationError);

      expect(projectKeys.keys.length).toBe(0);
    });
  });

  describe("DeactivateProjectMcpKeyHandler", () => {
    it("should deactivate key for maintainer", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const maintainer = TestData.createUser("Maintainer", "maintainer@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      project.addMember(maintainer.id, ProjectRole.Maintainer, new Date());
      await projects.add(project);

      projectKeys.keys.push({
        id: "key-1",
        projectId: project.id,
        keyFingerprint: "fingerprint-1",
        keyHash: "hash-1",
        description: "Key 1",
        isActive: true,
        createdOnUtc: "2026-01-01T00:00:00.000Z",
      });

      const handler = new DeactivateProjectMcpKeyHandler(projects, projectKeys);
      await handler.handle({
        requestContext: memberContext(maintainer.id),
        projectId: project.id,
        keyId: "key-1",
      });

      expect(projectKeys.keys[0].isActive).toBe(false);
    });

    it("should reject deactivation by viewer", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const viewer = TestData.createUser("Viewer", "viewer@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      project.addMember(viewer.id, ProjectRole.Viewer, new Date());
      await projects.add(project);

      projectKeys.keys.push({
        id: "key-1",
        projectId: project.id,
        keyFingerprint: "fingerprint-1",
        keyHash: "hash-1",
        description: "Key 1",
        isActive: true,
        createdOnUtc: "2026-01-01T00:00:00.000Z",
      });

      const handler = new DeactivateProjectMcpKeyHandler(projects, projectKeys);

      await expect(
        handler.handle({
          requestContext: memberContext(viewer.id),
          projectId: project.id,
          keyId: "key-1",
        }),
      ).rejects.toThrow(ApplicationError);

      expect(projectKeys.keys[0].isActive).toBe(true);
    });

    it("should reject deactivation of non-existent key", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      await projects.add(project);

      const handler = new DeactivateProjectMcpKeyHandler(projects, projectKeys);

      await expect(
        handler.handle({
          requestContext: ownerContext(owner.id),
          projectId: project.id,
          keyId: "nonexistent",
        }),
      ).rejects.toThrow(ApplicationError);
    });
  });

  describe("DeleteProjectMcpKeyHandler", () => {
    it("should delete key with correct confirmation name", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      await projects.add(project);

      projectKeys.keys.push({
        id: "key-1",
        projectId: project.id,
        keyFingerprint: "fingerprint-1",
        keyHash: "hash-1",
        description: "Delete me",
        isActive: true,
        createdOnUtc: "2026-01-01T00:00:00.000Z",
      });

      const handler = new DeleteProjectMcpKeyHandler(projects, projectKeys);
      await handler.handle({
        requestContext: ownerContext(owner.id),
        projectId: project.id,
        keyId: "key-1",
        confirmationName: "Delete me",
      });

      expect(projectKeys.keys.length).toBe(0);
    });

    it("should reject delete with wrong confirmation name", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      await projects.add(project);

      projectKeys.keys.push({
        id: "key-1",
        projectId: project.id,
        keyFingerprint: "fingerprint-1",
        keyHash: "hash-1",
        description: "Delete me",
        isActive: true,
        createdOnUtc: "2026-01-01T00:00:00.000Z",
      });

      const handler = new DeleteProjectMcpKeyHandler(projects, projectKeys);

      await expect(
        handler.handle({
          requestContext: ownerContext(owner.id),
          projectId: project.id,
          keyId: "key-1",
          confirmationName: "Wrong name",
        }),
      ).rejects.toThrow(ApplicationError);

      expect(projectKeys.keys.length).toBe(1);
    });

    it("should reject delete by non-member", async () => {
      const projects = new InMemoryProjectRepository();
      const projectKeys = new InMemoryProjectKeyRepository();
      const owner = TestData.createUser("Owner", "owner@example.com");
      const stranger = TestData.createUser("Stranger", "stranger@example.com");
      const project = Project.create(
        ProjectName.create("Test"),
        Description.create(""),
        ExternalReference.create(""),
        owner.id,
        new Date(),
      );
      await projects.add(project);

      projectKeys.keys.push({
        id: "key-1",
        projectId: project.id,
        keyFingerprint: "fingerprint-1",
        keyHash: "hash-1",
        description: "Delete me",
        isActive: true,
        createdOnUtc: "2026-01-01T00:00:00.000Z",
      });

      const handler = new DeleteProjectMcpKeyHandler(projects, projectKeys);

      await expect(
        handler.handle({
          requestContext: memberContext(stranger.id),
          projectId: project.id,
          keyId: "key-1",
          confirmationName: "Delete me",
        }),
      ).rejects.toThrow(ApplicationError);
    });
  });
});
