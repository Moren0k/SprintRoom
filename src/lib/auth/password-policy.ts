const MIN_PASSWORD_LENGTH = 12;

export function readPasswordPolicyError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!/[a-z]/.test(password)) {
    return "La contrasena debe incluir al menos una letra minuscula.";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contrasena debe incluir al menos una letra mayuscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "La contrasena debe incluir al menos un numero.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "La contrasena debe incluir al menos un caracter especial.";
  }
  return null;
}

export function isStrongPassword(password: string): boolean {
  return readPasswordPolicyError(password) === null;
}

export const PASSWORD_POLICY_HINT =
  "Minimo 12 caracteres, con mayuscula, minuscula, numero y caracter especial.";
