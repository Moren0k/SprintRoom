import { NextResponse } from "next/server";
import { createInsForgeDatabaseGateway, createInsForgeRepositoryScope } from "@/src/lib/insforge";
import { McpService } from "@/src/lib/mcp/service";
import { resolveProjectKey } from "@/src/lib/mcp/auth";
import { parseToolArgs, MCP_TOOL_DEFINITIONS } from "@/src/lib/mcp/tools";
import { InsForgeAuditLogger } from "@/src/lib/audit/audit-logger";
import { SystemClock } from "@/src/lib/system-clock";
import {
  McpGetSprintTaskDetailHandler,
  McpUpdateTaskStatusHandler,
  McpBulkUpdateTasksHandler,
  AddTaskAgentNoteHandler,
} from "@/src/application/features/tasks";
import {
  McpCreateTaskCommentHandler,
  McpCreateTaskHandler,
  McpCreateUserStoryHandler,
  McpUpdateTaskDetailsHandler,
  McpAssignTaskHandler,
} from "@/src/application/features/mcp-write";
import {
  GetProjectDetailHandler,
  ListProjectMembersHandler,
  ListTaskCommentsHandler,
  ListTaskAgentNotesHandler,
  GetProjectActivityHandler,
} from "@/src/application/features/mcp-read";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/src/server/rate-limit";

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
  // 0. Rate limit by PROJECT_KEY or client IP before doing any work
  {
    const projectKey = request.headers.get("X-Project-Key")?.trim() ?? "";
    const identifier = projectKey.length > 0 ? projectKey : getClientIp(request);
    const rl = checkRateLimit("mcp", identifier);
    if (!rl.allowed) {
      return rateLimitResponse(rl.resetMs);
    }
  }

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
    const database = createInsForgeDatabaseGateway();
    const { projectId, keyId } = await resolveProjectKey(database, projectKey);
    const auditLogger = new InsForgeAuditLogger(database);
    const clock = new SystemClock();
    const repositories = createInsForgeRepositoryScope(database);

    const taskDetailHandler = new McpGetSprintTaskDetailHandler(
      repositories.sprintTasks,
    );
    const updateTaskStatusHandler = new McpUpdateTaskStatusHandler(
      repositories.sprintTasks,
      repositories.unitOfWork,
      clock,
    );
    const bulkUpdateTasksHandler = new McpBulkUpdateTasksHandler(
      repositories.sprintTasks,
      repositories.unitOfWork,
      clock,
    );
    const addTaskAgentNoteHandler = new AddTaskAgentNoteHandler(
      repositories.sprintTasks,
      repositories.taskAgentNotes,
    );
    const getProjectDetailHandler = new GetProjectDetailHandler(
      repositories.projects,
      repositories.userStories,
      repositories.sprintTasks,
    );
    const listProjectMembersHandler = new ListProjectMembersHandler(
      repositories.projects,
      repositories.users,
    );
    const listTaskCommentsHandler = new ListTaskCommentsHandler(
      repositories.sprintTasks,
      repositories.users,
    );
    const listTaskAgentNotesHandler = new ListTaskAgentNotesHandler(
      repositories.sprintTasks,
      repositories.taskAgentNotes,
    );
    const getProjectActivityHandler = new GetProjectActivityHandler(
      repositories.auditEvents,
    );
    const createTaskCommentHandler = new McpCreateTaskCommentHandler(
      repositories.sprintTasks,
      repositories.projects,
      repositories.unitOfWork,
      clock,
    );
    const createTaskHandler = new McpCreateTaskHandler(
      repositories.sprintTasks,
      repositories.userStories,
      repositories.users,
      repositories.projects,
      repositories.unitOfWork,
      clock,
    );
    const createUserStoryHandler = new McpCreateUserStoryHandler(
      repositories.userStories,
      repositories.unitOfWork,
      clock,
    );
    const updateTaskDetailsHandler = new McpUpdateTaskDetailsHandler(
      repositories.sprintTasks,
      repositories.unitOfWork,
      clock,
    );
    const assignTaskHandler = new McpAssignTaskHandler(
      repositories.sprintTasks,
      repositories.users,
      repositories.projects,
      repositories.unitOfWork,
      clock,
    );

    const service = new McpService(
      database,
      auditLogger,
      keyId,
      taskDetailHandler,
      updateTaskStatusHandler,
      bulkUpdateTasksHandler,
      addTaskAgentNoteHandler,
      getProjectDetailHandler,
      listProjectMembersHandler,
      listTaskCommentsHandler,
      listTaskAgentNotesHandler,
      getProjectActivityHandler,
      createTaskCommentHandler,
      createTaskHandler,
      createUserStoryHandler,
      updateTaskDetailsHandler,
      assignTaskHandler,
    );

    // 4. Dispatch by protocol
    if (isJsonRpc) {
      return handleJsonRpc(projectId, service, body as Record<string, unknown>);
    }

    return handleCustomHttp(projectId, service, body as Record<string, unknown>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor MCP.";
    if (isJsonRpc) {
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: rpcId, error: { code: -32603, message } }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
}

/**
 * JSON-RPC 2.0 handler — MCP protocolo estandar.
 */
async function handleJsonRpc(
  projectId: string,
  service: McpService,
  body: Record<string, unknown>,
): Promise<Response> {
  const id = body.id ?? null;
  const method = typeof body.method === "string" ? body.method : "";
  const params =
    typeof body.params === "object" && body.params !== null && !Array.isArray(body.params)
      ? (body.params as Record<string, unknown>)
      : {};

  function negotiateProtocolVersion(requested: unknown): string {
    if (typeof requested === "string") {
      const v = requested.trim();
      if (v && v !== "0.1.0") return v;
    }
    return "2024-11-05";
  }

  if (method === "initialize") {
    return mcpResult(id, {
      protocolVersion: negotiateProtocolVersion(params.protocolVersion),
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
      } else if (parsed.tool === "bulk_update_tasks") {
        result = await service.bulkUpdateTasks(projectId, parsed);
      } else if (parsed.tool === "add_task_agent_note") {
        result = await service.addTaskAgentNote(projectId, parsed);
      } else if (parsed.tool === "get_sprintroom_mcp_skill") {
        result = await service.getSprintroomMcpSkill(projectId, parsed);
      } else if (parsed.tool === "get_project_detail") {
        result = await service.getProjectDetail(projectId, parsed);
      } else if (parsed.tool === "list_project_members") {
        result = await service.listProjectMembers(projectId, parsed);
      } else if (parsed.tool === "list_task_comments") {
        result = await service.listTaskComments(projectId, parsed);
      } else if (parsed.tool === "list_task_agent_notes") {
        result = await service.listTaskAgentNotes(projectId, parsed);
      } else if (parsed.tool === "get_project_activity") {
        result = await service.getProjectActivity(projectId, parsed);
      } else if (parsed.tool === "create_task_comment") {
        result = await service.createTaskComment(projectId, parsed);
      } else if (parsed.tool === "create_task") {
        result = await service.createTask(projectId, parsed);
      } else if (parsed.tool === "create_user_story") {
        result = await service.createUserStory(projectId, parsed);
      } else if (parsed.tool === "update_task_details") {
        result = await service.updateTaskDetails(projectId, parsed);
      } else if (parsed.tool === "assign_task") {
        result = await service.assignTask(projectId, parsed);
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
  service: McpService,
  body: Record<string, unknown>,
): Promise<Response> {
  try {
    const parsed = parseToolArgs(body);

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
    } else if (parsed.tool === "bulk_update_tasks") {
      result = await service.bulkUpdateTasks(projectId, parsed);
    } else if (parsed.tool === "add_task_agent_note") {
      result = await service.addTaskAgentNote(projectId, parsed);
    } else if (parsed.tool === "get_sprintroom_mcp_skill") {
      result = await service.getSprintroomMcpSkill(projectId, parsed);
    } else if (parsed.tool === "get_project_detail") {
      result = await service.getProjectDetail(projectId, parsed);
    } else if (parsed.tool === "list_project_members") {
      result = await service.listProjectMembers(projectId, parsed);
    } else if (parsed.tool === "list_task_comments") {
      result = await service.listTaskComments(projectId, parsed);
    } else if (parsed.tool === "list_task_agent_notes") {
      result = await service.listTaskAgentNotes(projectId, parsed);
    } else if (parsed.tool === "get_project_activity") {
      result = await service.getProjectActivity(projectId, parsed);
    } else if (parsed.tool === "create_task_comment") {
      result = await service.createTaskComment(projectId, parsed);
    } else if (parsed.tool === "create_task") {
      result = await service.createTask(projectId, parsed);
    } else if (parsed.tool === "create_user_story") {
      result = await service.createUserStory(projectId, parsed);
    } else if (parsed.tool === "update_task_details") {
      result = await service.updateTaskDetails(projectId, parsed);
    } else if (parsed.tool === "assign_task") {
      result = await service.assignTask(projectId, parsed);
    } else {
      return mcpError("unknown_tool", "Herramienta no disponible.");
    }

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en la ejecucion de la herramienta.";
    return mcpError("tool_error", message);
  }
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
