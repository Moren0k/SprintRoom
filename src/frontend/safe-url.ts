export function readSafeExternalUrl(value: string | undefined): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return value;
  }

  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" || url.protocol === "tel:") {
      return value;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
