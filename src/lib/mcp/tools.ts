import type {
  McpToolDefinition,
  McpToolName,
  McpToolArgument,
  GetProjectBacklogArgs,
  GetUserStoryByIdArgs,
  GetTaskByIdArgs,
  SearchTasksArgs,
  UpdateTaskStatusArgs,
  AddTaskAgentNoteArgs,
  GetSprintroomMcpSkillArgs,
} from "./types";

/**
 * Definiciones de herramientas MCP disponibles para el agente de IA.
 * Cada herramienta tiene un nombre, descripcion y esquema de parametros.
 */
export const MCP_TOOL_DEFINITIONS: ReadonlyArray<McpToolDefinition> = [
  {
    name: "get_project_backlog",
    description:
      "Obtiene todo el backlog del proyecto: proyecto, historias de usuario y tareas agrupadas por historia con estados, progreso y notas del agente.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "get_project_backlog",
          description: "Nombre de la herramienta",
        },
      },
      required: ["tool"],
    },
  },
  {
    name: "get_user_story_by_id",
    description:
      "Obtiene una historia de usuario por su ID, incluyendo sus tareas asociadas, progreso y notas del agente.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "get_user_story_by_id",
        },
        userStoryId: {
          type: "string",
          description: "UUID de la historia de usuario",
        },
      },
      required: ["tool", "userStoryId"],
    },
  },
  {
    name: "get_task_by_id",
    description:
      "Obtiene una tarea por su ID, incluyendo contexto de la historia de usuario y notas del agente.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "get_task_by_id",
        },
        taskId: {
          type: "string",
          description: "UUID de la tarea",
        },
      },
      required: ["tool", "taskId"],
    },
  },
  {
    name: "search_tasks",
    description:
      "Busca tareas por texto, estado o historia de usuario. Devuelve resultados filtrados con contexto completo.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "search_tasks",
        },
        query: {
          type: "string",
          description: "Texto de busqueda en titulo y descripcion (opcional)",
        },
        status: {
          type: "string",
          enum: ["not_started", "in_progress", "testing", "review", "completed"],
          description: "Filtrar por estado (opcional)",
        },
        storyId: {
          type: "string",
          description: "UUID de la historia de usuario para filtrar (opcional)",
        },
      },
      required: ["tool"],
    },
  },
  {
    name: "update_task_status",
    description:
      "Actualiza el estado de una tarea. Estados permitidos: not_started, in_progress, testing, review, completed.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "update_task_status",
        },
        taskId: {
          type: "string",
          description: "UUID de la tarea a actualizar",
        },
        status: {
          type: "string",
          enum: ["not_started", "in_progress", "testing", "review", "completed"],
          description: "Nuevo estado de la tarea",
        },
      },
      required: ["tool", "taskId", "status"],
    },
  },
  {
    name: "add_task_agent_note",
    description:
      "Registra una nota del agente de IA sobre una tarea. Sirve para dejar registro de archivos modificados, decisiones tecnicas, bloqueos o resumen de implementacion.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "add_task_agent_note",
        },
        taskId: {
          type: "string",
          description: "UUID de la tarea",
        },
        content: {
          type: "string",
          description: "Contenido de la nota del agente",
        },
      },
      required: ["tool", "taskId", "content"],
    },
  },
  {
    name: "get_sprintroom_mcp_skill",
    description:
      "Devuelve la skill oficial sprintroom-mcp como paquete instalable para que el agente la cree o actualice en el proyecto del usuario.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "get_sprintroom_mcp_skill",
        },
      },
      required: ["tool"],
    },
  },
];

export function isKnownTool(value: string): value is McpToolName {
  return MCP_TOOL_DEFINITIONS.some((def) => def.name === value);
}

export function parseToolArgs(body: Record<string, unknown>): McpToolArgument {
  const tool = body.tool;

  if (typeof tool !== "string" || !isKnownTool(tool)) {
    throw new McpDispatchError(
      `Herramienta desconocida: "${String(tool)}". Herramientas disponibles: ${MCP_TOOL_DEFINITIONS.map((d) => d.name).join(", ")}`,
    );
  }

  switch (tool) {
    case "get_project_backlog":
      return { tool } as GetProjectBacklogArgs;

    case "get_user_story_by_id": {
      const userStoryId = body.userStoryId;
      if (typeof userStoryId !== "string" || userStoryId.length === 0) {
        throw new McpDispatchError("userStoryId es obligatorio.");
      }
      return { tool, userStoryId } as GetUserStoryByIdArgs;
    }

    case "get_task_by_id": {
      const taskId = body.taskId;
      if (typeof taskId !== "string" || taskId.length === 0) {
        throw new McpDispatchError("taskId es obligatorio.");
      }
      return { tool, taskId } as GetTaskByIdArgs;
    }

    case "search_tasks": {
      const q = body.query;
      if (q !== undefined && typeof q !== "string") {
        throw new McpDispatchError("query debe ser texto.");
      }
      const status = body.status;
      if (
        status !== undefined &&
        !["not_started", "in_progress", "testing", "review", "completed"].includes(status as string)
      ) {
        throw new McpDispatchError(
          "status debe ser uno de: not_started, in_progress, testing, review, completed.",
        );
      }
      const storyId = body.storyId;
      if (storyId !== undefined && typeof storyId !== "string") {
        throw new McpDispatchError("storyId debe ser texto.");
      }
      return {
        tool,
        query: q as string | undefined,
        status: status as SearchTasksArgs["status"],
        storyId: storyId as string | undefined,
      } as SearchTasksArgs;
    }

    case "update_task_status": {
      const taskId = body.taskId;
      if (typeof taskId !== "string" || taskId.length === 0) {
        throw new McpDispatchError("taskId es obligatorio.");
      }
      const status = body.status;
      if (!["not_started", "in_progress", "testing", "review", "completed"].includes(status as string)) {
        throw new McpDispatchError(
          "status debe ser uno de: not_started, in_progress, testing, review, completed.",
        );
      }
      return { tool, taskId, status } as UpdateTaskStatusArgs;
    }

    case "add_task_agent_note": {
      const taskId = body.taskId;
      if (typeof taskId !== "string" || taskId.length === 0) {
        throw new McpDispatchError("taskId es obligatorio.");
      }
      const content = body.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new McpDispatchError("content es obligatorio y debe ser texto.");
      }
      return { tool, taskId, content } as AddTaskAgentNoteArgs;
    }

    case "get_sprintroom_mcp_skill":
      return { tool } as GetSprintroomMcpSkillArgs;

    default:
      throw new McpDispatchError(`Herramienta no implementada: ${tool}`);
  }
}

export class McpDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpDispatchError";
  }
}
