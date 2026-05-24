#!/usr/bin/env node

import { createInterface } from "node:readline";

const SERVER_NAME = "sprintroom-mcp";
const SERVER_VERSION = "1.1.0";
const PROTOCOL_VERSION = "0.1.0";

function getEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

const API_URL = getEnv("SPRINTROOM_API_URL").replace(/\/+$/, "");
const PROJECT_KEY = getEnv("SPRINTROOM_PROJECT_KEY");

function writeJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data) + "\n");
}

function logStderr(message: string): void {
  process.stderr.write(`[sprintroom-mcp] ${message}\n`);
}

function jsonRpcError(id: unknown, code: number, message: string): void {
  writeJson({ jsonrpc: "2.0", id, error: { code, message } });
}

function toolErrorResult(message: string): Record<string, unknown> {
  return { content: [{ type: "text", text: message }], isError: true };
}

function handleInitialize(id: unknown): void {
  writeJson({
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    },
  });
}

function handlePing(id: unknown): void {
  writeJson({ jsonrpc: "2.0", id, result: {} });
}

async function handleToolsList(id: unknown): Promise<void> {
  const data = await proxyRequest({ method: "tools/list", params: {} });
  if (data.error) {
    writeJson({ jsonrpc: "2.0", id, error: data.error });
    return;
  }
  writeJson({
    jsonrpc: "2.0",
    id,
    result: { tools: (data.result as { tools: unknown[] } | undefined)?.tools ?? [] },
  });
}

async function handleToolsCall(
  id: unknown,
  params: Record<string, unknown>,
): Promise<void> {
  const data = await proxyRequest({ method: "tools/call", params });

  if (data.error) {
    writeJson({ jsonrpc: "2.0", id, error: data.error });
    return;
  }

  const result = data.result;
  if (result !== undefined) {
    if (
      typeof result === "object" &&
      result !== null &&
      "content" in (result as Record<string, unknown>)
    ) {
      writeJson({ jsonrpc: "2.0", id, result });
      return;
    }
    writeJson({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(result) }],
      },
    });
    return;
  }

  writeJson({ jsonrpc: "2.0", id, ...toolErrorResult("Respuesta inesperada del servidor SprintRoom.") });
}

async function proxyRequest(opts: {
  method: string;
  params: Record<string, unknown>;
}): Promise<{ result?: unknown; error?: { code: number; message: string } }> {
  const url = `${API_URL}/api/mcp`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Project-Key": PROJECT_KEY,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: opts.method,
        params: opts.params,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexion con SprintRoom.";
    logStderr(`proxy error: ${msg}`);
    return { error: { code: -32000, message: `Error de conexion: ${msg}` } };
  }

  try {
    const data = (await response.json()) as Record<string, unknown>;

    if (data.error) {
      const err = data.error as Record<string, unknown>;
      return {
        error: {
          code: typeof err.code === "number" ? err.code : -32000,
          message: typeof err.message === "string" ? err.message : "Error desconocido",
        },
      };
    }

    return { result: data.result };
  } catch {
    return { error: { code: -32000, message: "Respuesta invalida del servidor SprintRoom." } };
  }
}

function isNotification(
  request: Record<string, unknown>,
): boolean {
  return !("id" in request) || request.id === undefined;
}

async function handleLine(line: string): Promise<void> {
  let request: Record<string, unknown>;
  try {
    request = JSON.parse(line) as Record<string, unknown>;
  } catch {
    writeJson({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Error de parseo JSON." },
    });
    return;
  }

  if (typeof request !== "object" || Array.isArray(request) || request === null) {
    writeJson({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "El mensaje debe ser un objeto JSON." },
    });
    return;
  }

  if (isNotification(request)) {
    return;
  }

  const id = request.id;
  const method = typeof request.method === "string" ? request.method : "";

  const params =
    typeof request.params === "object" &&
    request.params !== null &&
    !Array.isArray(request.params)
      ? (request.params as Record<string, unknown>)
      : {};

  if (method === "initialize") {
    handleInitialize(id);
  } else if (method === "ping") {
    handlePing(id);
  } else if (method === "tools/list") {
    await handleToolsList(id);
  } else if (method === "tools/call") {
    await handleToolsCall(id, params);
  } else {
    jsonRpcError(
      id,
      -32601,
      `Metodo no soportado: ${method}. Soporta: initialize, ping, tools/list, tools/call`,
    );
  }
}

async function main(): Promise<void> {
  if (!API_URL) {
    logStderr("Falta SPRINTROOM_API_URL en las variables de entorno.");
    process.exit(1);
  }
  if (!PROJECT_KEY) {
    logStderr("Falta SPRINTROOM_PROJECT_KEY en las variables de entorno.");
    process.exit(1);
  }

  logStderr(`Conectado a ${API_URL}`);

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      await handleLine(trimmed);
    } catch (error) {
      logStderr(
        `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    }
  }
}

main().catch((err) => {
  logStderr(`Error fatal: ${err instanceof Error ? err.message : "Error desconocido"}`);
  process.exit(1);
});
