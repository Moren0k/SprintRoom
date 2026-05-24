import { NextResponse } from "next/server";
import { createInsForgeDatabaseGateway } from "@/src/lib/insforge";
import { McpService, McpServiceError } from "@/src/lib/mcp/service";
import { resolveProjectKey, McpAuthenticationError } from "@/src/lib/mcp/auth";
import { parseToolArgs, MCP_TOOL_DEFINITIONS, McpDispatchError } from "@/src/lib/mcp/tools";

/**
 * Endpoint MCP para integracion con agentes de IA.
 *
 * Soporta dos protocolos:
 *
 * 1. JSON-RPC 2.0 (MCP estandar) — compatible con OpenCode, Cursor, Claude Desktop:
 *    POST /api/mcp
 *    { "jsonrpc": "2.0", "id": 1, "method": "tools/list" }
 *    { "jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": { "name": "...", "arguments": {...} } }
 *
 * 2. HTTP API simplificada (usada por los prompts de la UI):
 *    POST /api/mcp
 *    { "tool": "get_project_backlog" }
 *    GET  /api/mcp  → descubrimiento de herramientas
 *
 * Todas las operaciones estan filtradas por `projectId` derivado
 * de la PROJECT_KEY. Ninguna herramienta puede acceder a datos
 * de otros proyectos.
 */

const MCP_VERSION = "mcp-sprintroom-1.0";

export async function POST(request: Request): Promise<Response> {
  // 1. Parse body first to detect protocol
  const body = await request.json().catch(() => null);
  const isJsonRpc = body !== null && typeof body === "object" && !Array.isArray(body) && body.jsonrpc === "2.0";
  const rpcId = isJsonRpc && typeof (body as Record<string, unknown>).id !== "undefined" ? (body as Record<string, unknown>).id : null;

  try {
    const projectKey = request.headers.get("X-Project-Key")?.trim() ?? "";

    // 2. Validate body
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return isJsonRpc
        ? mcpRpcError(rpcId, -32700, "El cuerpo de la peticion debe ser un objeto JSON.")
        : mcpError("invalid_request", "El cuerpo de la peticion debe ser un objeto JSON.");
    }

    // 3. Validate PROJECT_KEY and resolve project
    const authDatabase = createInsForgeDatabaseGateway();
    const { projectId } = await resolveProjectKey(authDatabase, projectKey);
    const database = createInsForgeDatabaseGateway();

    // 4. Dispatch by protocol
    if (isJsonRpc) {
      return handleJsonRpc(projectId, database, body as Record<string, unknown>);
    }

    return handleCustomHttp(projectId, database, body as Record<string, unknown>);
  } catch (error) {
    if (error instanceof McpAuthenticationError) {
      return isJsonRpc
        ? mcpRpcError(rpcId, -32000, error.message)
        : mcpError(error.code, error.message);
    }
    if (error instanceof McpDispatchError) {
      return isJsonRpc
        ? mcpErrorResult(rpcId, error.message)
        : mcpError("invalid_arguments", error.message);
    }
    if (error instanceof McpServiceError) {
      return isJsonRpc
        ? mcpErrorResult(rpcId, error.message)
        : mcpError(error.code, error.message);
    }
    return isJsonRpc
      ? mcpRpcError(rpcId, -32603, "Error interno del servidor MCP.")
      : mcpError("internal_error", "Error interno del servidor MCP.");
  }
}

/**
 * JSON-RPC 2.0 handler — MCP protocolo estandar.
 */
async function handleJsonRpc(
  projectId: string,
  database: ReturnType<typeof createInsForgeDatabaseGateway>,
  body: Record<string, unknown>,
): Promise<Response> {
  const id = body.id ?? null;
  const method = typeof body.method === "string" ? body.method : "";
  const params =
    typeof body.params === "object" && body.params !== null && !Array.isArray(body.params)
      ? (body.params as Record<string, unknown>)
      : {};

  if (method === "initialize") {
    return mcpResult(id, {
      protocolVersion: "0.1.0",
      capabilities: { tools: {} },
      serverInfo: { name: "sprintroom-mcp", version: MCP_VERSION },
    });
  }

  if (method === "tools/list") {
    return mcpResult(id, {
      tools: MCP_TOOL_DEFINITIONS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    });
  }

  if (method === "tools/call") {
    const toolName = typeof params.name === "string" ? params.name : "";
    const toolArgs =
      typeof params.arguments === "object" && params.arguments !== null && !Array.isArray(params.arguments)
        ? (params.arguments as Record<string, unknown>)
        : params;

    try {
      const service = new McpService(database);
      const parsed = parseToolArgs({ ...toolArgs, tool: toolName });
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
        return mcpErrorResult(id, `Herramienta no disponible: ${toolName}`);
      }

      return mcpToolResult(id, result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error interno del servidor MCP.";
      return mcpErrorResult(id, message);
    }
  }

  return mcpRpcError(id, -32601, `Metodo no soportado: ${method}. Soporta: initialize, tools/list, tools/call`);
}

/**
 * Custom HTTP handler — protocolo simplificado usado por los prompts de la UI.
 */
async function handleCustomHttp(
  projectId: string,
  database: ReturnType<typeof createInsForgeDatabaseGateway>,
  body: Record<string, unknown>,
): Promise<Response> {
  const parsed = parseToolArgs(body);
  const service = new McpService(database);

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
    return mcpError("unknown_tool", "Herramienta no disponible.");
  }

  return NextResponse.json({ data: result }, { status: 200 });
}

/**
 * Devuelve las definiciones de herramientas MCP (GET request).
 * Usado por agentes para descubrimiento (formato HTTP simple).
 */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    {
      mcpVersion: MCP_VERSION,
      protocol: "custom-http (JSON-RPC 2.0 tambien soportado via POST)",
      tools: MCP_TOOL_DEFINITIONS,
    },
    { status: 200 },
  );
}

function mcpError(code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status: 400 });
}

/* ── Helpers para formato MCP compliant ── */

function mcpResult(id: unknown, data: Record<string, unknown>): NextResponse {
  return NextResponse.json({ jsonrpc: "2.0", id, result: data }, { status: 200 });
}

function mcpToolResult(id: unknown, data: unknown): NextResponse {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      },
    },
    { status: 200 },
  );
}

function mcpErrorResult(id: unknown, message: string): NextResponse {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      },
    },
    { status: 200 },
  );
}

function mcpRpcError(id: unknown, code: number, message: string): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status: 400 },
  );
}
