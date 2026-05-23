import { describe, expect, it } from "vitest";
import { Project } from "../../../src/domain/aggregates/project";
import { ProjectRole } from "../../../src/domain/enums/project-role";
import { DomainError } from "../../../src/domain/errors/domain-error";
import { UserId } from "../../../src/domain/ids/user-id";
import { Description } from "../../../src/domain/value-objects/description";
import { ExternalReference } from "../../../src/domain/value-objects/external-reference";
import { ProjectName } from "../../../src/domain/value-objects/project-name";

describe("Project aggregate", () => {
  it("create should add owner as member", () => {
    const ownerId = UserId.new();
    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Proyecto principal"),
      ExternalReference.create("https://example.com/repo"),
      ownerId,
      new Date(),
    );

    expect(project.hasMember(ownerId)).toBe(true);
    expect(
      project.members.some(
        (m) => m.id === ownerId && m.role === ProjectRole.Owner,
      ),
    ).toBe(true);
  });

  it("addMember should reject duplicates", () => {
    const ownerId = UserId.new();
    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Proyecto principal"),
      ExternalReference.create("https://example.com/repo"),
      ownerId,
      new Date(),
    );
    const memberId = UserId.new();
    project.addMember(memberId, ProjectRole.Contributor, new Date());

    expect(() =>
      project.addMember(memberId, ProjectRole.Contributor, new Date()),
    ).toThrow(DomainError);
  });

  it("removeMember should reject owner", () => {
    const ownerId = UserId.new();
    const project = Project.create(
      ProjectName.create("SprintRoom"),
      Description.create("Proyecto principal"),
      ExternalReference.create("https://example.com/repo"),
      ownerId,
      new Date(),
    );
    expect(() => project.removeMember(ownerId, new Date())).toThrow(DomainError);
  });
});
