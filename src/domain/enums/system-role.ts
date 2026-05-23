/**
 * Roles globales del sistema.
 */
export const SystemRole = {
  Member: "Member",
  Administrator: "Administrator",
} as const;

export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];
