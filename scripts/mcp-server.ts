import { createInterface } from "node:readline";
import { createInsForgeDatabaseGateway, createInsForgeRepositoryScope } from "@/src/lib/insforge";
import { McpService } from "@/src/lib/mcp/service";
import { resolveProjectKey, McpAuthenticationError } from "@/src/lib/mcp/auth";
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
  GetProjectDetailHandler,
  ListProjectMembersHandler,
  ListTaskCommentsHandler,
  ListTaskAgentNotesHandler,
  GetProjectActivityHandler,
} from "@/src/application/features/mcp-read";
import {
  McpCreateTaskCommentHandler,
  McpCreateTaskHandler,
  McpCreateUserStoryHandler,
  McpUpdateTaskDetailsHandler,
  McpAssignTaskHandler,
} from "@/src/application/features/mcp-write";

const SERVER_NAME = "sprintroom-mcp";
const SERVER_VERSION = "mcp-sprintroom-1.0";

// MCP clients expect a date-based protocol version (e.g. 2024-11-05).
// Keep a sane default and, when possible, echo the client's requested version.
const DEFAULT_PROTOCOL_VERSION = "2024-11-05";

function negotiateProtocolVersion(requested: unknown): string {
  if (typeof requested === "string") {
    const v = requested.trim();
    if (v && v !== "0.1.0") return v;
  }
  return DEFAULT_PROTOCOL_VERSION;
}

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

async function handleInitialize(
  id: unknown,
  params: Record<string, unknown>,
): Promise<void> {
  writeJson({
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: negotiateProtocolVersion(params.protocolVersion),
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
    await handleInitialize(id, params);
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
    const database = createInsForgeDatabaseGateway();
    const resolution = await resolveProjectKey(database, projectKey);
    projectId = resolution.projectId;
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

    service = new McpService(
      database,
      auditLogger,
      resolution.keyId,
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
