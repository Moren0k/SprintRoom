const ALLOWED_APP_PATH_PREFIXES = [
  "/dashboard",
  "/projects",
  "/tasks",
  "/account",
  "/documentacion",
  "/imagine",
];

export function readSafeAppPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (typeof next !== "string") {
    return fallback;
  }

  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(next, "https://sprintroom.local");
    if (parsed.origin !== "https://sprintroom.local") {
      return fallback;
    }
    const allowed = ALLOWED_APP_PATH_PREFIXES.some((prefix) =>
      parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );
    if (!allowed) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}
