/**
 * Origen funcional de una cuenta de usuario.
 */
export const AccountOrigin = {
  PublicRegistration: "PublicRegistration",
  AdministrativeProvisioning: "AdministrativeProvisioning",
  GoogleOAuth: "GoogleOAuth",
} as const;

export type AccountOrigin = (typeof AccountOrigin)[keyof typeof AccountOrigin];
