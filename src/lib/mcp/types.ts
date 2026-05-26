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
  | "get_sprintroom_mcp_skill"
  | "get_project_detail"
  | "list_project_members"
  | "list_task_comments"
  | "list_task_agent_notes"
  | "get_project_activity"
  | "create_task_comment"
  | "create_task"
  | "create_user_story"
  | "update_task_details"
  | "assign_task";

export type McpToolArgument =
  | GetProjectBacklogArgs
  | GetUserStoryByIdArgs
  | GetTaskByIdArgs
  | SearchTasksArgs
  | UpdateTaskStatusArgs
  | AddTaskAgentNoteArgs
  | GetSprintroomMcpSkillArgs
  | GetProjectDetailArgs
  | ListProjectMembersArgs
  | ListTaskCommentsArgs
  | ListTaskAgentNotesArgs
  | GetProjectActivityArgs
  | CreateTaskCommentArgs
  | CreateTaskArgs
  | CreateUserStoryArgs
  | UpdateTaskDetailsArgs
  | AssignTaskArgs;

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

export interface GetProjectDetailArgs {
  readonly tool: "get_project_detail";
}

export interface ListProjectMembersArgs {
  readonly tool: "list_project_members";
}

export interface ListTaskCommentsArgs {
  readonly tool: "list_task_comments";
  readonly taskId: string;
}

export interface ListTaskAgentNotesArgs {
  readonly tool: "list_task_agent_notes";
  readonly taskId: string;
}

export interface GetProjectActivityArgs {
  readonly tool: "get_project_activity";
  readonly limit?: number;
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

/* ==================== Fase 5B: Nuevas tools de escritura ================= */

export interface CreateTaskCommentArgs {
  readonly tool: "create_task_comment";
  readonly taskId: string;
  readonly body: string;
}

export interface CreateTaskArgs {
  readonly tool: "create_task";
  readonly userStoryId: string;
  readonly title: string;
  readonly description?: string;
  readonly assigneeIds?: ReadonlyArray<string>;
}

export interface CreateUserStoryArgs {
  readonly tool: "create_user_story";
  readonly title: string;
  readonly description?: string;
}

export interface UpdateTaskDetailsArgs {
  readonly tool: "update_task_details";
  readonly taskId: string;
  readonly title?: string;
  readonly description?: string;
}

export interface AssignTaskArgs {
  readonly tool: "assign_task";
  readonly taskId: string;
  readonly assigneeIds: ReadonlyArray<string>;
}

export interface McpCreateTaskCommentResult {
  readonly id: string;
  readonly taskId: string;
  readonly body: string;
  readonly createdOnUtc: string;
}

export interface McpCreateTaskResult {
  readonly taskId: string;
  readonly userStoryId: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly assigneeIds: ReadonlyArray<string>;
}

export interface McpCreateUserStoryResult {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly createdOnUtc: string;
}

export interface McpUpdateTaskDetailsResult {
  readonly taskId: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly assigneeIds: ReadonlyArray<string>;
}

export interface McpAssignTaskResult {
  readonly taskId: string;
  readonly assigneeIds: ReadonlyArray<string>;
  readonly status: string;
}

/* ==================== Fase 5A: Nuevas tools de lectura =================== */

export interface McpProjectDetail {
  readonly project: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly externalReference: string;
    readonly progress: number;
    readonly counts: {
      readonly userStories: number;
      readonly tasks: number;
      readonly completedTasks: number;
      readonly members: number;
    };
    readonly createdOnUtc: string;
    readonly updatedOnUtc: string;
  };
}

export interface McpProjectMember {
  readonly userId: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: string;
  readonly joinedOnUtc: string;
}

export interface McpProjectMemberList {
  readonly members: ReadonlyArray<McpProjectMember>;
}

export interface McpTaskComment {
  readonly id: string;
  readonly taskId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly body: string;
  readonly createdOnUtc: string;
}

export interface McpTaskCommentList {
  readonly comments: ReadonlyArray<McpTaskComment>;
}

export interface McpTaskAgentNoteItem {
  readonly id: string;
  readonly taskId: string;
  readonly content: string;
  readonly createdOnUtc: string;
}

export interface McpTaskAgentNoteList {
  readonly notes: ReadonlyArray<McpTaskAgentNoteItem>;
}

export interface McpProjectActivityEvent {
  readonly id: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly occurredOnUtc: string;
}

export interface McpProjectActivity {
  readonly events: ReadonlyArray<McpProjectActivityEvent>;
}
