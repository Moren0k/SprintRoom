export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    const error = readErrorPayload(payload);
    throw new ApiClientError(
      error.message ?? "No fue posible completar la solicitud.",
      response.status,
      error.code,
    );
  }

  if (isRecord(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocurrio un error inesperado.";
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function readErrorPayload(payload: unknown): { code?: string; message?: string } {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return {};
  }
  return {
    code: typeof payload.error.code === "string" ? payload.error.code : undefined,
    message:
      typeof payload.error.message === "string"
        ? payload.error.message
        : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
