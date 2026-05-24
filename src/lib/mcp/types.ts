/* ============================================================
 * MCP — tipos de respuesta y esquemas de herramientas
 *
 * Estos tipos representan la proyeccion enriquecida que el
 * endpoint MCP devuelve al agente de IA. No son los DTOs de
 * la capa de aplicacion, sino una vista especifica para la
 * integracion MCP.
 * ============================================================ */

export type McpTaskStatus = "not_started" | "in_progress" | "testing" | "review" | "completed";

/* ====================== Herramientas MCP =================== */

export type McpToolName =
  | "get_project_backlog"
  | "get_user_story_by_id"
  | "get_task_by_id"
  | "search_tasks"
  | "update_task_status"
  | "add_task_agent_note"
  | "get_sprintroom_mcp_skill";

export type McpToolArgument =
  | GetProjectBacklogArgs
  | GetUserStoryByIdArgs
  | GetTaskByIdArgs
  | SearchTasksArgs
  | UpdateTaskStatusArgs
  | AddTaskAgentNoteArgs
  | GetSprintroomMcpSkillArgs;

export interface McpToolDefinition {
  readonly name: McpToolName;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

/* ======================== Payloads de request ============== */

export interface GetProjectBacklogArgs {
  readonly tool: "get_project_backlog";
}

export interface GetUserStoryByIdArgs {
  readonly tool: "get_user_story_by_id";
  readonly userStoryId: string;
}

export interface GetTaskByIdArgs {
  readonly tool: "get_task_by_id";
  readonly taskId: string;
}

export interface SearchTasksArgs {
  readonly tool: "search_tasks";
  readonly query?: string;
  readonly status?: McpTaskStatus;
  readonly storyId?: string;
}

export interface UpdateTaskStatusArgs {
  readonly tool: "update_task_status";
  readonly taskId: string;
  readonly status: McpTaskStatus;
}

export interface AddTaskAgentNoteArgs {
  readonly tool: "add_task_agent_note";
  readonly taskId: string;
  readonly content: string;
}

export interface GetSprintroomMcpSkillArgs {
  readonly tool: "get_sprintroom_mcp_skill";
}

/* ======================== Payloads de respuesta ============ */

export interface McpProjectBacklog {
  readonly project: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly progress: number;
  };
  readonly userStories: ReadonlyArray<McpUserStoryWithTasks>;
}

export interface McpUserStoryWithTasks {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly progress: number;
  readonly tasks: ReadonlyArray<McpTask>;
}

export interface McpUserStoryDetail {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly progress: number;
  readonly tasks: ReadonlyArray<McpTask>;
}

export interface McpTask {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: McpTaskStatus;
  readonly userStoryId: string;
  readonly userStoryTitle: string;
  readonly assigneeIds: ReadonlyArray<string>;
  readonly commentCount: number;
  readonly agentNotes: ReadonlyArray<McpAgentNote>;
}

export interface McpTaskDetail {
  readonly task: {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly status: McpTaskStatus;
    readonly assigneeIds: ReadonlyArray<string>;
    readonly commentCount: number;
    readonly agentNotes: ReadonlyArray<McpAgentNote>;
  };
  readonly userStory: {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly progress: number;
  };
  readonly project: {
    readonly id: string;
    readonly name: string;
  };
}

export interface McpTaskSearchResult {
  readonly tasks: ReadonlyArray<McpTask>;
  readonly totalCount: number;
}

export interface McpAgentNote {
  readonly id: string;
  readonly content: string;
  readonly createdOnUtc: string;
}

export interface McpStatusUpdateResult {
  readonly taskId: string;
  readonly previousStatus: McpTaskStatus;
  readonly newStatus: McpTaskStatus;
}

export interface McpNoteAddResult {
  readonly noteId: string;
  readonly taskId: string;
  readonly content: string;
  readonly createdOnUtc: string;
}

export interface McpSkillPackageFile {
  readonly path: string;
  readonly content: string;
}

export interface McpSkillPackageToolSummary {
  readonly name: McpToolName;
  readonly description: string;
}

export interface McpSkillPackage {
  readonly name: "sprintroom-mcp";
  readonly version: string;
  readonly description: string;
  readonly recommendedInstallDir: "sprintroom-mcp";
  readonly installDirPriority: readonly [".agentes/", ".skills/", ".sprintroom/"];
  readonly files: ReadonlyArray<McpSkillPackageFile>;
  readonly agentsInstruction: string;
  readonly tools: ReadonlyArray<McpSkillPackageToolSummary>;
  readonly lastUpdated: string;
}
