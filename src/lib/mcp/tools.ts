import type {
  McpToolDefinition,
  McpToolName,
  McpToolArgument,
  GetProjectBacklogArgs,
  GetUserStoryByIdArgs,
  GetTaskByIdArgs,
  SearchTasksArgs,
  UpdateTaskStatusArgs,
  BulkUpdateTasksArgs,
  AddTaskAgentNoteArgs,
  GetSprintroomMcpSkillArgs,
  GetProjectDetailArgs,
  ListProjectMembersArgs,
  ListTaskCommentsArgs,
  ListTaskAgentNotesArgs,
  GetProjectActivityArgs,
  CreateTaskCommentArgs,
  CreateTaskArgs,
  CreateUserStoryArgs,
  UpdateTaskDetailsArgs,
  AssignTaskArgs,
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
    name: "bulk_update_tasks",
    description:
      "Actualiza el estado de multiples tareas en una sola peticion. Devuelve exitos y fallos por tarea.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "bulk_update_tasks",
        },
        updates: {
          type: "array",
          maxItems: 50,
          items: {
            type: "object",
            properties: {
              taskId: { type: "string", description: "UUID de la tarea a actualizar" },
              status: {
                type: "string",
                enum: ["not_started", "in_progress", "testing", "review", "completed"],
                description: "Nuevo estado de la tarea",
              },
            },
            required: ["taskId", "status"],
          },
        },
      },
      required: ["tool", "updates"],
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
  {
    name: "get_project_detail",
    description:
      "Obtiene informacion detallada del proyecto actual: nombre, descripcion, referencia externa, progreso, conteo de historias, tareas, tareas completadas y miembros.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "get_project_detail",
        },
      },
      required: ["tool"],
    },
  },
  {
    name: "list_project_members",
    description:
      "Lista los miembros del proyecto actual con sus roles, nombres, correos y fecha de ingreso.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "list_project_members",
        },
      },
      required: ["tool"],
    },
  },
  {
    name: "list_task_comments",
    description:
      "Obtiene los comentarios de una tarea especifica, incluyendo autor, contenido y fecha.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "list_task_comments",
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
    name: "list_task_agent_notes",
    description:
      "Obtiene las notas de agente registradas en una tarea especifica.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "list_task_agent_notes",
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
    name: "get_project_activity",
    description:
      "Obtiene eventos recientes de auditoria del proyecto. Por defecto devuelve los 20 ultimos eventos.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          const: "get_project_activity",
        },
        limit: {
          type: "number",
          description: "Numero maximo de eventos a devolver (max 50, default 20)",
        },
      },
      required: ["tool"],
    },
  },
  {
    name: "create_task_comment",
    description:
      "Agrega un comentario a una tarea existente. El autor del comentario se asigna automaticamente como el propietario del proyecto.",
    inputSchema: {
      type: "object",
      properties: {
        tool: { type: "string", const: "create_task_comment" },
        taskId: { type: "string", description: "UUID de la tarea" },
        body: { type: "string", description: "Contenido del comentario (max 2000 caracteres)" },
      },
      required: ["tool", "taskId", "body"],
    },
  },
  {
    name: "create_task",
    description:
      "Crea una nueva tarea dentro de una historia de usuario existente. Opcionalmente asigna usuarios del proyecto.",
    inputSchema: {
      type: "object",
      properties: {
        tool: { type: "string", const: "create_task" },
        userStoryId: { type: "string", description: "UUID de la historia de usuario" },
        title: { type: "string", description: "Titulo de la tarea (max 160 caracteres)" },
        description: { type: "string", description: "Descripcion de la tarea (opcional, max 2000 caracteres)" },
        assigneeIds: { type: "array", items: { type: "string" }, description: "UUIDs de usuarios a asignar (opcional)" },
      },
      required: ["tool", "userStoryId", "title"],
    },
  },
  {
    name: "create_user_story",
    description:
      "Crea una nueva historia de usuario en el proyecto actual.",
    inputSchema: {
      type: "object",
      properties: {
        tool: { type: "string", const: "create_user_story" },
        title: { type: "string", description: "Titulo de la historia de usuario (max 160 caracteres)" },
        description: { type: "string", description: "Descripcion (opcional, max 2000 caracteres)" },
      },
      required: ["tool", "title"],
    },
  },
  {
    name: "update_task_details",
    description:
      "Actualiza el titulo y/o descripcion de una tarea existente. Solo se actualizan los campos proporcionados.",
    inputSchema: {
      type: "object",
      properties: {
        tool: { type: "string", const: "update_task_details" },
        taskId: { type: "string", description: "UUID de la tarea" },
        title: { type: "string", description: "Nuevo titulo (opcional, max 160 caracteres)" },
        description: { type: "string", description: "Nueva descripcion (opcional, max 2000 caracteres)" },
      },
      required: ["tool", "taskId"],
    },
  },
  {
    name: "assign_task",
    description:
      "Reemplaza los usuarios asignados a una tarea. Los usuarios deben existir y pertenecer al proyecto.",
    inputSchema: {
      type: "object",
      properties: {
        tool: { type: "string", const: "assign_task" },
        taskId: { type: "string", description: "UUID de la tarea" },
        assigneeIds: { type: "array", items: { type: "string" }, description: "UUIDs de usuarios a asignar" },
      },
      required: ["tool", "taskId", "assigneeIds"],
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

    case "bulk_update_tasks": {
      const updates = body.updates;
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new McpDispatchError("updates es obligatorio y debe ser un arreglo no vacio.");
      }
      if (updates.length > 50) {
        throw new McpDispatchError("updates no puede exceder 50 tareas por peticion.");
      }

      return {
        tool,
        updates: updates.map((item, index) => {
          if (item === null || typeof item !== "object" || Array.isArray(item)) {
            throw new McpDispatchError(`updates[${index}] debe ser un objeto.`);
          }
          const update = item as Record<string, unknown>;
          const taskId = update.taskId;
          if (typeof taskId !== "string" || taskId.length === 0) {
            throw new McpDispatchError(`updates[${index}].taskId es obligatorio.`);
          }
          const status = update.status;
          if (!validTaskStatus(status)) {
            throw new McpDispatchError(
              `updates[${index}].status debe ser uno de: not_started, in_progress, testing, review, completed.`,
            );
          }
          return { taskId, status };
        }),
      } as BulkUpdateTasksArgs;
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

    case "get_project_detail":
      return { tool } as GetProjectDetailArgs;

    case "list_project_members":
      return { tool } as ListProjectMembersArgs;

    case "list_task_comments": {
      const taskId = body.taskId;
      if (typeof taskId !== "string" || taskId.length === 0) {
        throw new McpDispatchError("taskId es obligatorio.");
      }
      return { tool, taskId } as ListTaskCommentsArgs;
    }

    case "list_task_agent_notes": {
      const taskId = body.taskId;
      if (typeof taskId !== "string" || taskId.length === 0) {
        throw new McpDispatchError("taskId es obligatorio.");
      }
      return { tool, taskId } as ListTaskAgentNotesArgs;
    }

    case "get_project_activity": {
      const limit = body.limit;
      if (limit !== undefined) {
        if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1) {
          throw new McpDispatchError("limit debe ser un numero entero positivo.");
        }
        if (limit > 50) {
          throw new McpDispatchError("limit no puede exceder 50.");
        }
      }
      return {
        tool,
        limit: limit as number | undefined,
      } as GetProjectActivityArgs;
    }

    /* ============ Fase 5B: Write tools ============ */

    case "create_task_comment": {
      const taskId = body.taskId;
      if (typeof taskId !== "string" || taskId.length === 0) {
        throw new McpDispatchError("taskId es obligatorio.");
      }
      const cbody = body.body;
      if (typeof cbody !== "string" || cbody.trim().length === 0) {
        throw new McpDispatchError("body es obligatorio y debe ser texto.");
      }
      return { tool, taskId, body: cbody } as CreateTaskCommentArgs;
    }

    case "create_task": {
      const userStoryId = body.userStoryId;
      if (typeof userStoryId !== "string" || userStoryId.length === 0) {
        throw new McpDispatchError("userStoryId es obligatorio.");
      }
      const title = body.title;
      if (typeof title !== "string" || title.trim().length === 0) {
        throw new McpDispatchError("title es obligatorio.");
      }
      const description = body.description;
      if (description !== undefined && typeof description !== "string") {
        throw new McpDispatchError("description debe ser texto.");
      }
      const assigneeIds = body.assigneeIds;
      if (assigneeIds !== undefined) {
        if (!Array.isArray(assigneeIds) || !assigneeIds.every((id) => typeof id === "string")) {
          throw new McpDispatchError("assigneeIds debe ser un arreglo de UUIDs.");
        }
      }
      return {
        tool,
        userStoryId,
        title,
        description: description as string | undefined,
        assigneeIds: assigneeIds as ReadonlyArray<string> | undefined,
      } as CreateTaskArgs;
    }

    case "create_user_story": {
      const title = body.title;
      if (typeof title !== "string" || title.trim().length === 0) {
        throw new McpDispatchError("title es obligatorio.");
      }
      const description = body.description;
      if (description !== undefined && typeof description !== "string") {
        throw new McpDispatchError("description debe ser texto.");
      }
      return {
        tool,
        title,
        description: description as string | undefined,
      } as CreateUserStoryArgs;
    }

    case "update_task_details": {
      const taskId = body.taskId;
      if (typeof taskId !== "string" || taskId.length === 0) {
        throw new McpDispatchError("taskId es obligatorio.");
      }
      const title = body.title;
      if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
        throw new McpDispatchError("title debe ser texto no vacio.");
      }
      const description = body.description;
      if (description !== undefined && typeof description !== "string") {
        throw new McpDispatchError("description debe ser texto.");
      }
      if (title === undefined && description === undefined) {
        throw new McpDispatchError("Debe especificar al menos title o description.");
      }
      return {
        tool,
        taskId,
        title: title as string | undefined,
        description: description as string | undefined,
      } as UpdateTaskDetailsArgs;
    }

    case "assign_task": {
      const taskId = body.taskId;
      if (typeof taskId !== "string" || taskId.length === 0) {
        throw new McpDispatchError("taskId es obligatorio.");
      }
      const assigneeIds = body.assigneeIds;
      if (!Array.isArray(assigneeIds) || !assigneeIds.every((id) => typeof id === "string")) {
        throw new McpDispatchError("assigneeIds debe ser un arreglo de UUIDs.");
      }
      return { tool, taskId, assigneeIds: assigneeIds as ReadonlyArray<string> } as AssignTaskArgs;
    }

    default:
      throw new McpDispatchError(`Herramienta no implementada: ${tool}`);
  }
}

function validTaskStatus(value: unknown): boolean {
  return ["not_started", "in_progress", "testing", "review", "completed"].includes(value as string);
}

export class McpDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpDispatchError";
  }
}
