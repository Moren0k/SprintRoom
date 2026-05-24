export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export const MCP_TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: "get_project_backlog",
    description:
      "Obtiene todo el backlog del proyecto: proyecto, historias de usuario y tareas agrupadas por historia con estados, progreso y notas del agente.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_user_story_by_id",
    description:
      "Obtiene una historia de usuario por su ID, incluyendo sus tareas asociadas, progreso y notas del agente.",
    inputSchema: {
      type: "object",
      properties: {
        userStoryId: { type: "string", description: "UUID de la historia de usuario" },
      },
      required: ["userStoryId"],
    },
  },
  {
    name: "get_task_by_id",
    description:
      "Obtiene una tarea por su ID, incluyendo contexto de la historia de usuario y notas del agente.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "UUID de la tarea" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "search_tasks",
    description:
      "Busca tareas por texto, estado o historia de usuario. Devuelve resultados filtrados con contexto completo.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto de busqueda en titulo y descripcion (opcional)" },
        status: {
          type: "string",
          enum: ["not_started", "in_progress", "testing", "review", "completed"],
          description: "Filtrar por estado (opcional)",
        },
        storyId: { type: "string", description: "UUID de la historia de usuario para filtrar (opcional)" },
      },
      required: [],
    },
  },
  {
    name: "update_task_status",
    description:
      "Actualiza el estado de una tarea. Estados permitidos: not_started, in_progress, testing, review, completed.",
    inputSchema: {
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
  {
    name: "add_task_agent_note",
    description:
      "Registra una nota del agente de IA sobre una tarea. Sirve para dejar registro de archivos modificados, decisiones tecnicas, bloqueos o resumen de implementacion.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "UUID de la tarea" },
        content: { type: "string", description: "Contenido de la nota del agente" },
      },
      required: ["taskId", "content"],
    },
  },
  {
    name: "get_sprintroom_mcp_skill",
    description:
      "Devuelve la skill oficial sprintroom-mcp como paquete instalable para que el agente la cree o actualice en el proyecto del usuario.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];
