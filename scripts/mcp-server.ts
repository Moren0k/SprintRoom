import { createInterface } from "node:readline";
import { createInsForgeDatabaseGateway } from "@/src/lib/insforge";
import { McpService } from "@/src/lib/mcp/service";
import { resolveProjectKey, McpAuthenticationError } from "@/src/lib/mcp/auth";
import { parseToolArgs, MCP_TOOL_DEFINITIONS } from "@/src/lib/mcp/tools";

const SERVER_NAME = "sprintroom-mcp";
const SERVER_VERSION = "mcp-sprintroom-1.0";
const PROTOCOL_VERSION = "0.1.0";

let projectId: string;
let service: McpService;

function writeJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data) + "\n");
}

function logStderr(message: string): void {
  process.stderr.write(`[sprintroom-mcp] ${message}\n`);
}

function jsonRpcError(id: unknown, code: number, message: string): void {
  writeJson({ jsonrpc: "2.0", id, error: { code, message } });
}

function toolSuccessResult(result: unknown): unknown {
  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
  };
}

function toolErrorResult(message: string): unknown {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

async function handleInitialize(id: unknown): Promise<void> {
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

function handleToolsList(id: unknown): void {
  writeJson({
    jsonrpc: "2.0",
    id,
    result: {
      tools: MCP_TOOL_DEFINITIONS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    },
  });
}

function handlePing(id: unknown): void {
  writeJson({ jsonrpc: "2.0", id, result: {} });
}

async function handleToolsCall(
  id: unknown,
  params: Record<string, unknown>,
): Promise<void> {
  const toolName = typeof params.name === "string" ? params.name : "";
  const toolArgs =
    typeof params.arguments === "object" &&
    params.arguments !== null &&
    !Array.isArray(params.arguments)
      ? (params.arguments as Record<string, unknown>)
      : params;

  let parsed: ReturnType<typeof parseToolArgs>;
  try {
    parsed = parseToolArgs({ ...toolArgs, tool: toolName });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Argumentos invalidos para la herramienta.";
    writeJson({
      jsonrpc: "2.0",
      id,
      result: toolErrorResult(message),
    });
    return;
  }

  try {
    let result: unknown;

    if (parsed.tool === "get_project_backlog") {
      result = await service.getProjectBacklog(projectId, parsed);
    } else if (parsed.tool === "get_user_story_by_id") {
      result = await service.getUserStoryById(projectId, parsed);
    } else if (parsed.tool === "get_task_by_id") {
      result = await service.getTaskById(projectId, parsed);
    } else if (parsed.tool === "search_tasks") {
      result = await service.searchTasks(projectId, parsed);
    } else if (parsed.tool === "update_task_status") {
      result = await service.updateTaskStatus(projectId, parsed);
    } else if (parsed.tool === "add_task_agent_note") {
      result = await service.addTaskAgentNote(projectId, parsed);
    } else if (parsed.tool === "get_sprintroom_mcp_skill") {
      result = await service.getSprintroomMcpSkill(projectId, parsed);
    } else {
      jsonRpcError(id, -32602, `Herramienta no disponible: ${toolName}`);
      return;
    }

    writeJson({
      jsonrpc: "2.0",
      id,
      result: toolSuccessResult(result),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor MCP.";
    logStderr(`tools/call error: ${message}`);
    writeJson({
      jsonrpc: "2.0",
      id,
      result: toolErrorResult(message),
    });
  }
}

async function handleRequest(line: string): Promise<void> {
  let request: Record<string, unknown>;
  try {
    request = JSON.parse(line);
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

  const method = typeof request.method === "string" ? request.method : "";
  const isNotification = !("id" in request) || request.id === undefined;

  if (isNotification) {
    return;
  }

  const id = request.id;

  const params =
    typeof request.params === "object" &&
    request.params !== null &&
    !Array.isArray(request.params)
      ? (request.params as Record<string, unknown>)
      : {};

  if (method === "initialize") {
    await handleInitialize(id);
  } else if (method === "ping") {
    handlePing(id);
  } else if (method === "tools/list") {
    handleToolsList(id);
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
  const projectKey = process.env.SPRINTROOM_PROJECT_KEY?.trim() ?? "";

  if (projectKey.length === 0) {
    logStderr("Falta SPRINTROOM_PROJECT_KEY en las variables de entorno.");
    process.exit(1);
  }

  try {
    const authDatabase = createInsForgeDatabaseGateway();
    const resolution = await resolveProjectKey(authDatabase, projectKey);
    projectId = resolution.projectId;
    const database = createInsForgeDatabaseGateway();
    service = new McpService(database);
    logStderr(`Iniciado para projectId: ${projectId}`);
  } catch (error) {
    if (error instanceof McpAuthenticationError) {
      logStderr(`Error de autenticacion: ${error.message}`);
    } else {
      logStderr(`Error al inicializar: ${error instanceof Error ? error.message : "Error desconocido"}`);
    }
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      await handleRequest(trimmed);
    } catch (error) {
      logStderr(`Error manejando request: ${error instanceof Error ? error.message : "Error desconocido"}`);
    }
  }
}

main().catch((error) => {
  logStderr(`Error fatal: ${error instanceof Error ? error.message : "Error desconocido"}`);
  process.exit(1);
});
