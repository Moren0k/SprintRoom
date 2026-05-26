import { describe, expect, it } from "vitest";
import { isValidPayload } from "../../src/frontend/use-task-status-realtime";

describe("isValidPayload", () => {
  const valid: unknown = {
    projectId: "proj-1",
    taskId: "task-1",
    userStoryId: "story-1",
    status: "in_progress",
    isCompleted: false,
    updatedOnUtc: "2026-05-26T12:00:00Z",
  };

  it("acepta un payload valido", () => {
    expect(isValidPayload(valid)).toBe(true);
  });

  it("rechaza null", () => {
    expect(isValidPayload(null)).toBe(false);
  });

  it("rechaza undefined", () => {
    expect(isValidPayload(undefined)).toBe(false);
  });

  it("rechaza string", () => {
    expect(isValidPayload("foo")).toBe(false);
  });

  it("rechaza si falta projectId", () => {
    const { projectId: _unused, ...rest } = valid as Record<string, unknown>;
    void _unused;
    expect(isValidPayload(rest)).toBe(false);
  });

  it("rechaza si taskId no es string", () => {
    expect(isValidPayload({ ...(valid as Record<string, unknown>), taskId: 123 })).toBe(false);
  });

  it("rechaza si isCompleted no es boolean", () => {
    expect(isValidPayload({ ...(valid as Record<string, unknown>), isCompleted: "true" })).toBe(false);
  });

  it("rechaza si userStoryId es numero", () => {
    expect(isValidPayload({ ...(valid as Record<string, unknown>), userStoryId: 42 })).toBe(false);
  });
});
