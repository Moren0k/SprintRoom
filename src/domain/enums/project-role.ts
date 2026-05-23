/**
 * Roles que un usuario puede tener dentro de un proyecto.
 */
export const ProjectRole = {
  Viewer: "Viewer",
  Contributor: "Contributor",
  Maintainer: "Maintainer",
  Owner: "Owner",
} as const;

export type ProjectRole = (typeof ProjectRole)[keyof typeof ProjectRole];
