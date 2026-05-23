/**
 * Marca de tipo (branded type) para crear identificadores fuertes basados en
 * `string` (UUID). Sustituye al `readonly record struct` de C#.
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Genera un nuevo identificador UUID. Encapsulado en este helper para poder
 * sustituirlo facilmente en pruebas si fuera necesario.
 */
export function newUuid(): string {
  // crypto.randomUUID esta disponible en Node 18+, navegadores modernos y
  // entornos de Next.js. Devuelve un string en formato UUID v4.
  return crypto.randomUUID();
}

/**
 * Compara dos identificadores por su valor textual.
 */
export function idEquals<TBrand>(
  a: Brand<string, TBrand> | null | undefined,
  b: Brand<string, TBrand> | null | undefined,
): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  return (a as string) === (b as string);
}
