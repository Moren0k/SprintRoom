import type { InsForgeDatabaseGateway } from "../insforge/database-gateway";
import type {
  ProjectRow,
  ProjectMemberRow,
  UserStoryRow,
  SprintTaskRow,
  SprintTaskAssignmentRow,
  TaskCommentRow,
  TaskAgentNoteRow,
} from "../insforge/schema";
import type {
  GetProjectBacklogArgs,
  GetUserStoryByIdArgs,
  GetTaskByIdArgs,
  SearchTasksArgs,
  UpdateTaskStatusArgs,
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
  McpProjectBacklog,
  McpUserStoryWithTasks,
  McpUserStoryDetail,
  McpTaskDetail,
  McpTaskSearchResult,
  McpStatusUpdateResult,
  McpNoteAddResult,
  McpSkillPackage,
  McpTask,
  McpTaskStatus,
  McpAgentNote,
  McpProjectDetail,
  McpProjectMemberList,
  McpTaskCommentList,
  McpTaskAgentNoteList,
  McpProjectActivity,
  McpCreateTaskCommentResult,
  McpCreateTaskResult,
  McpCreateUserStoryResult,
  McpUpdateTaskDetailsResult,
  McpAssignTaskResult,
} from "./types";
import { getSprintroomMcpSkillPackage } from "./skill";
import type { InsForgeAuditLogger } from "../audit/audit-logger";
import type {
  McpGetSprintTaskDetailHandler,
  McpUpdateTaskStatusHandler,
  AddTaskAgentNoteHandler,
} from "../../application/features/tasks";
import type {
  GetProjectDetailHandler,
  ListProjectMembersHandler,
  ListTaskCommentsHandler,
  ListTaskAgentNotesHandler,
  GetProjectActivityHandler,
} from "../../application/features/mcp-read";
import type {
  McpCreateTaskCommentHandler,
  McpCreateTaskHandler,
  McpCreateUserStoryHandler,
  McpUpdateTaskDetailsHandler,
  McpAssignTaskHandler,
} from "../../application/features/mcp-write";
import { ApplicationError } from "../../application/abstractions/application-error";

export class McpServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "McpServiceError";
  }
}

/**
 * Servicio que agrega datos del proyecto para el endpoint MCP.
 * Todas las consultas reciben un `projectId` y filtran por el,
 * asegurando aislamiento entre proyectos.
 */
export class McpService {
  constructor(
    private readonly database: InsForgeDatabaseGateway,
    private readonly auditLogger: InsForgeAuditLogger,
    private readonly projectKeyId: string,
    private readonly taskDetailHandler: McpGetSprintTaskDetailHandler,
    private readonly updateTaskStatusHandler: McpUpdateTaskStatusHandler,
    private readonly addTaskAgentNoteHandler: AddTaskAgentNoteHandler,
    private readonly getProjectDetailHandler: GetProjectDetailHandler,
    private readonly listProjectMembersHandler: ListProjectMembersHandler,
    private readonly listTaskCommentsHandler: ListTaskCommentsHandler,
    private readonly listTaskAgentNotesHandler: ListTaskAgentNotesHandler,
    private readonly getProjectActivityHandler: GetProjectActivityHandler,
    private readonly createTaskCommentHandler: McpCreateTaskCommentHandler,
    private readonly createTaskHandler: McpCreateTaskHandler,
    private readonly createUserStoryHandler: McpCreateUserStoryHandler,
    private readonly updateTaskDetailsHandler: McpUpdateTaskDetailsHandler,
    private readonly assignTaskHandler: McpAssignTaskHandler,
  ) {}

  /* ===================== get_project_backlog =================== */

  async getProjectBacklog(
    projectId: string,
    _args: GetProjectBacklogArgs,
  ): Promise<McpProjectBacklog> {
    const project = await this.loadProject(projectId);
    const stories = await this.database.selectRows<UserStoryRow>("user_stories", {
      filters: [{ operator: "eq", column: "project_id", value: projectId }],
      orderBy: { column: "created_on_utc", ascending: true },
    });
    const allTasks = await this.loadTasksForProject(projectId);

    const userStories: McpUserStoryWithTasks[] = [];
    for (const story of stories) {
      const storyTasks = allTasks.filter((t) => t.user_story_id === story.id);
      const tasks = await this.enrichTasks(storyTasks, projectId);
      const completed = storyTasks.filter((t) => t.status === "completed").length;
      const progress = storyTasks.length === 0 ? 0 : Math.round((completed * 100) / storyTasks.length);

      userStories.push({
        id: story.id,
        title: story.title,
        description: story.description,
        progress,
        tasks,
      });
    }

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        progress: this.calculateProjectProgress(stories.length, allTasks),
      },
      userStories,
    };
  }

  /* ===================== get_user_story_by_id ================= */

  async getUserStoryById(
    projectId: string,
    args: GetUserStoryByIdArgs,
  ): Promise<McpUserStoryDetail> {
    const story = await this.database.selectOne<UserStoryRow>("user_stories", [
      { operator: "eq", column: "id", value: args.userStoryId },
      { operator: "eq", column: "project_id", value: projectId },
    ]);
    if (story === null) {
      throw new McpServiceError(
        "user_story_not_found",
        "La historia de usuario no existe o no pertenece a este proyecto.",
      );
    }

    const taskRows = await this.database.selectRows<SprintTaskRow>("sprint_tasks", {
      filters: [
        { operator: "eq", column: "user_story_id", value: story.id },
        { operator: "eq", column: "project_id", value: projectId },
      ],
      orderBy: { column: "created_on_utc", ascending: true },
    });
    const tasks = await this.enrichTasks(taskRows, projectId);
    const completed = taskRows.filter((t) => t.status === "completed").length;
    const progress = taskRows.length === 0 ? 0 : Math.round((completed * 100) / taskRows.length);

    return {
      id: story.id,
      title: story.title,
      description: story.description,
      progress,
      tasks,
    };
  }

  /* ===================== get_task_by_id ======================= */

  async getTaskById(
    projectId: string,
    args: GetTaskByIdArgs,
  ): Promise<McpTaskDetail> {
    const taskDetail = await this.runHandler(() =>
      this.taskDetailHandler.handle({
        projectId,
        sprintTaskId: args.taskId,
      }),
    );

    const story = await this.database.selectOne<UserStoryRow>("user_stories", [
      { operator: "eq", column: "id", value: taskDetail.userStoryId },
    ]);

    const project = await this.database.selectOne<ProjectRow>("projects", [
      { operator: "eq", column: "id", value: projectId },
    ]);

    const enriched = await this.enrichTasks(
      [{
        id: taskDetail.sprintTaskId,
        project_id: projectId,
        user_story_id: taskDetail.userStoryId,
        title: taskDetail.title,
        description: taskDetail.description,
        is_completed: taskDetail.isCompleted,
        status: taskDetail.status,
        created_on_utc: "",
        updated_on_utc: "",
      }],
      projectId,
    );

    return {
      task: {
        id: taskDetail.sprintTaskId,
        title: taskDetail.title,
        description: taskDetail.description,
        status: taskDetail.status as McpTaskStatus,
        assigneeIds: taskDetail.assigneeIds,
        commentCount: taskDetail.comments.length,
        agentNotes: enriched.length > 0 ? enriched[0].agentNotes : [],
      },
      userStory: {
        id: story?.id ?? "",
        title: story?.title ?? "Historia no disponible",
        description: story?.description ?? "",
        progress: 0,
      },
      project: {
        id: projectId,
        name: project?.name ?? "Proyecto no disponible",
      },
    };
  }

  /* ===================== search_tasks ========================= */

  async searchTasks(
    projectId: string,
    args: SearchTasksArgs,
  ): Promise<McpTaskSearchResult> {
    const filters: Array<{ operator: "eq"; column: string; value: unknown }> = [
      { operator: "eq", column: "project_id", value: projectId },
    ];

    if (args.storyId !== undefined && args.storyId.length > 0) {
      filters.push({ operator: "eq", column: "user_story_id", value: args.storyId });
    }

    if (
      args.status !== undefined &&
      ["not_started", "in_progress", "testing", "review", "completed"].includes(args.status)
    ) {
      filters.push({ operator: "eq", column: "status", value: args.status });
    }

    let taskRows = await this.database.selectRows<SprintTaskRow>("sprint_tasks", {
      filters,
      orderBy: { column: "created_on_utc", ascending: false },
    });

    // Text search is done client-side since InsForge SDK has limited query
    if (args.query !== undefined && args.query.trim().length > 0) {
      const q = args.query.toLowerCase();
      taskRows = taskRows.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }

    const tasks = await this.enrichTasks(taskRows, projectId);

    return {
      tasks,
      totalCount: tasks.length,
    };
  }

  /* ===================== update_task_status =================== */

  async updateTaskStatus(
    projectId: string,
    args: UpdateTaskStatusArgs,
  ): Promise<McpStatusUpdateResult> {
    const sanitizedArgs = this.sanitizeArgs(args as unknown as Record<string, unknown>);

    try {
      const result = await this.updateTaskStatusHandler.handle({
        projectId,
        sprintTaskId: args.taskId,
        status: args.status,
      });

      await this.recordAuditEvent({
        projectId,
        tool: "update_task_status",
        entityType: "sprint_task",
        entityId: args.taskId,
        args: sanitizedArgs,
        result: "success",
        details: {
          previousStatus: result.previousStatus,
          newStatus: result.taskDetail.status,
        },
      });

      return {
        taskId: args.taskId,
        previousStatus: result.previousStatus as McpTaskStatus,
        newStatus: result.taskDetail.status as McpTaskStatus,
      };
    } catch (error) {
      if (error instanceof McpServiceError) throw error;
      const message = error instanceof Error ? error.message : "Error desconocido";
      await this.recordAuditEvent({
        projectId,
        tool: "update_task_status",
        entityType: "sprint_task",
        entityId: args.taskId,
        args: sanitizedArgs,
        result: "error",
        error: message,
      });
      throw error instanceof ApplicationError
        ? new McpServiceError("service_error", error.message)
        : error;
    }
  }

  /* ===================== add_task_agent_note ================== */

  async addTaskAgentNote(
    projectId: string,
    args: AddTaskAgentNoteArgs,
  ): Promise<McpNoteAddResult> {
    const sanitizedArgs = this.sanitizeArgs(args as unknown as Record<string, unknown>);

    try {
      const result = await this.addTaskAgentNoteHandler.handle({
        projectId,
        taskId: args.taskId,
        content: args.content,
      });

      await this.recordAuditEvent({
        projectId,
        tool: "add_task_agent_note",
        entityType: "task_agent_note",
        entityId: result.noteId,
        args: sanitizedArgs,
        result: "success",
      });

      return {
        noteId: result.noteId,
        taskId: result.taskId,
        content: result.content,
        createdOnUtc: result.createdOnUtc,
      };
    } catch (error) {
      if (error instanceof McpServiceError) throw error;
      const message = error instanceof Error ? error.message : "Error desconocido";
      await this.recordAuditEvent({
        projectId,
        tool: "add_task_agent_note",
        entityType: "task_agent_note",
        entityId: args.taskId,
        args: sanitizedArgs,
        result: "error",
        error: message,
      });
      throw error instanceof ApplicationError
        ? new McpServiceError("service_error", error.message)
        : error;
    }
  }

  /* ===================== get_sprintroom_mcp_skill ============= */

  async getSprintroomMcpSkill(
    _projectId: string,
    _args: GetSprintroomMcpSkillArgs,
  ): Promise<McpSkillPackage> {
    return getSprintroomMcpSkillPackage();
  }

  /* ===================== get_project_detail ================== */

  async getProjectDetail(
    projectId: string,
    _args: GetProjectDetailArgs,
  ): Promise<McpProjectDetail> {
    const result = await this.runHandler(() =>
      this.getProjectDetailHandler.handle({ projectId }),
    );

    return {
      project: {
        id: result.id,
        name: result.name,
        description: result.description,
        externalReference: result.externalReference,
        progress: result.progress,
        counts: { ...result.counts },
        createdOnUtc: result.createdOnUtc,
        updatedOnUtc: result.updatedOnUtc,
      },
    };
  }

  /* ===================== list_project_members ================ */

  async listProjectMembers(
    projectId: string,
    _args: ListProjectMembersArgs,
  ): Promise<McpProjectMemberList> {
    const members = await this.runHandler(() =>
      this.listProjectMembersHandler.handle({ projectId }),
    );

    return {
      members: members.map((m) => ({
        userId: m.userId,
        fullName: m.fullName,
        email: m.email,
        role: m.role,
        joinedOnUtc: m.joinedOnUtc,
      })),
    };
  }

  /* ===================== list_task_comments ================== */

  async listTaskComments(
    projectId: string,
    args: ListTaskCommentsArgs,
  ): Promise<McpTaskCommentList> {
    const comments = await this.runHandler(() =>
      this.listTaskCommentsHandler.handle({
        projectId,
        taskId: args.taskId,
      }),
    );

    return {
      comments: comments.map((c) => ({
        id: c.id,
        taskId: c.taskId,
        authorId: c.authorId,
        authorName: c.authorName,
        body: c.body,
        createdOnUtc: c.createdOnUtc,
      })),
    };
  }

  /* ===================== list_task_agent_notes =============== */

  async listTaskAgentNotes(
    projectId: string,
    args: ListTaskAgentNotesArgs,
  ): Promise<McpTaskAgentNoteList> {
    const notes = await this.runHandler(() =>
      this.listTaskAgentNotesHandler.handle({
        projectId,
        taskId: args.taskId,
      }),
    );

    return {
      notes: notes.map((n) => ({
        id: n.id,
        taskId: n.taskId,
        content: n.content,
        createdOnUtc: n.createdOnUtc,
      })),
    };
  }

  /* ===================== get_project_activity ================ */

  async getProjectActivity(
    projectId: string,
    args: GetProjectActivityArgs,
  ): Promise<McpProjectActivity> {
    const events = await this.runHandler(() =>
      this.getProjectActivityHandler.handle({
        projectId,
        limit: args.limit ?? 20,
      }),
    );

    return {
      events: events.map((e) => ({
        id: e.id,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        occurredOnUtc: e.occurredOnUtc,
      })),
    };
  }

  /* ===================== create_task_comment ================== */

  async createTaskComment(
    projectId: string,
    args: CreateTaskCommentArgs,
  ): Promise<McpCreateTaskCommentResult> {
    const sanitizedArgs = this.sanitizeArgs(args as unknown as Record<string, unknown>);

    try {
      const result = await this.runHandler(() =>
        this.createTaskCommentHandler.handle({
          projectId,
          taskId: args.taskId,
          body: args.body,
        }),
      );

      await this.recordAuditEvent({
        projectId,
        tool: "create_task_comment",
        entityType: "task_comment",
        entityId: result.id,
        args: sanitizedArgs,
        result: "success",
        details: { taskId: result.taskId },
      });

      return result;
    } catch (error) {
      if (error instanceof McpServiceError) throw error;
      const message = error instanceof Error ? error.message : "Error desconocido";
      await this.recordAuditEvent({
        projectId,
        tool: "create_task_comment",
        entityType: "task_comment",
        entityId: args.taskId,
        args: sanitizedArgs,
        result: "error",
        error: message,
      });
      throw error instanceof ApplicationError
        ? new McpServiceError("service_error", error.message)
        : error;
    }
  }

  /* ===================== create_task ========================== */

  async createTask(
    projectId: string,
    args: CreateTaskArgs,
  ): Promise<McpCreateTaskResult> {
    const sanitizedArgs = this.sanitizeArgs(args as unknown as Record<string, unknown>);

    try {
      const result = await this.runHandler(() =>
        this.createTaskHandler.handle({
          projectId,
          userStoryId: args.userStoryId,
          title: args.title,
          description: args.description ?? "",
          assigneeIds: args.assigneeIds ?? [],
        }),
      );

      await this.recordAuditEvent({
        projectId,
        tool: "create_task",
        entityType: "sprint_task",
        entityId: result.taskId,
        args: sanitizedArgs,
        result: "success",
        details: { userStoryId: result.userStoryId },
      });

      return result;
    } catch (error) {
      if (error instanceof McpServiceError) throw error;
      const message = error instanceof Error ? error.message : "Error desconocido";
      await this.recordAuditEvent({
        projectId,
        tool: "create_task",
        entityType: "sprint_task",
        entityId: args.userStoryId,
        args: sanitizedArgs,
        result: "error",
        error: message,
      });
      throw error instanceof ApplicationError
        ? new McpServiceError("service_error", error.message)
        : error;
    }
  }

  /* ===================== create_user_story ==================== */

  async createUserStory(
    projectId: string,
    args: CreateUserStoryArgs,
  ): Promise<McpCreateUserStoryResult> {
    const sanitizedArgs = this.sanitizeArgs(args as unknown as Record<string, unknown>);

    try {
      const result = await this.runHandler(() =>
        this.createUserStoryHandler.handle({
          projectId,
          title: args.title,
          description: args.description ?? "",
        }),
      );

      await this.recordAuditEvent({
        projectId,
        tool: "create_user_story",
        entityType: "user_story",
        entityId: result.id,
        args: sanitizedArgs,
        result: "success",
      });

      return result;
    } catch (error) {
      if (error instanceof McpServiceError) throw error;
      const message = error instanceof Error ? error.message : "Error desconocido";
      await this.recordAuditEvent({
        projectId,
        tool: "create_user_story",
        entityType: "user_story",
        entityId: "",
        args: sanitizedArgs,
        result: "error",
        error: message,
      });
      throw error instanceof ApplicationError
        ? new McpServiceError("service_error", error.message)
        : error;
    }
  }

  /* ===================== update_task_details ================== */

  async updateTaskDetails(
    projectId: string,
    args: UpdateTaskDetailsArgs,
  ): Promise<McpUpdateTaskDetailsResult> {
    const sanitizedArgs = this.sanitizeArgs(args as unknown as Record<string, unknown>);

    try {
      const result = await this.runHandler(() =>
        this.updateTaskDetailsHandler.handle({
          projectId,
          taskId: args.taskId,
          title: args.title,
          description: args.description,
        }),
      );

      await this.recordAuditEvent({
        projectId,
        tool: "update_task_details",
        entityType: "sprint_task",
        entityId: args.taskId,
        args: sanitizedArgs,
        result: "success",
        details: { changedFields: Object.keys(sanitizedArgs).filter((k) => k !== "taskId") },
      });

      return result;
    } catch (error) {
      if (error instanceof McpServiceError) throw error;
      const message = error instanceof Error ? error.message : "Error desconocido";
      await this.recordAuditEvent({
        projectId,
        tool: "update_task_details",
        entityType: "sprint_task",
        entityId: args.taskId,
        args: sanitizedArgs,
        result: "error",
        error: message,
      });
      throw error instanceof ApplicationError
        ? new McpServiceError("service_error", error.message)
        : error;
    }
  }

  /* ===================== assign_task ========================== */

  async assignTask(
    projectId: string,
    args: AssignTaskArgs,
  ): Promise<McpAssignTaskResult> {
    const sanitizedArgs = this.sanitizeArgs(args as unknown as Record<string, unknown>);

    try {
      const result = await this.runHandler(() =>
        this.assignTaskHandler.handle({
          projectId,
          taskId: args.taskId,
          assigneeIds: args.assigneeIds,
        }),
      );

      await this.recordAuditEvent({
        projectId,
        tool: "assign_task",
        entityType: "sprint_task",
        entityId: args.taskId,
        args: sanitizedArgs,
        result: "success",
        details: {
          assigneeIds: args.assigneeIds,
          status: result.status,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof McpServiceError) throw error;
      const message = error instanceof Error ? error.message : "Error desconocido";
      await this.recordAuditEvent({
        projectId,
        tool: "assign_task",
        entityType: "sprint_task",
        entityId: args.taskId,
        args: sanitizedArgs,
        result: "error",
        error: message,
      });
      throw error instanceof ApplicationError
        ? new McpServiceError("service_error", error.message)
        : error;
    }
  }

  /* ===================== auditoria =========================== */

  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (key === "tool") continue;
      if (key === "content" && typeof value === "string") {
        sanitized[key] = value.length > 500 ? value.slice(0, 500) + "..." : value;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private async recordAuditEvent(params: {
    projectId: string;
    tool: string;
    entityType: string;
    entityId: string;
    args: Record<string, unknown>;
    result: "success" | "error";
    error?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.auditLogger.record({
        actorId: null,
        projectId: params.projectId,
        action: `mcp.${params.tool}`,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: {
          projectKeyId: this.projectKeyId,
          projectId: params.projectId,
          tool: params.tool,
          args: params.args,
          entityType: params.entityType,
          entityId: params.entityId,
          result: params.result,
          ...(params.error !== undefined ? { error: params.error } : {}),
          ...(params.details !== undefined ? { details: params.details } : {}),
        },
      });
    } catch {
      // Audit failures never break the main operation
    }
  }

  /* ===================== helpers internos ===================== */

  private async loadProject(projectId: string): Promise<ProjectRow> {
    const project = await this.database.selectOne<ProjectRow>("projects", [
      { operator: "eq", column: "id", value: projectId },
    ]);
    if (project === null) {
      throw new McpServiceError("project_not_found", "El proyecto no existe.");
    }
    return project;
  }

  private async loadTasksForProject(projectId: string): Promise<SprintTaskRow[]> {
    return this.database.selectRows<SprintTaskRow>("sprint_tasks", {
      filters: [{ operator: "eq", column: "project_id", value: projectId }],
      orderBy: { column: "created_on_utc", ascending: true },
    });
  }

  private async enrichTasks(
    taskRows: SprintTaskRow[],
    projectId: string,
  ): Promise<McpTask[]> {
    if (taskRows.length === 0) return [];

    const taskIds = taskRows.map((t) => t.id);
    const storyIds = [...new Set(taskRows.map((t) => t.user_story_id))];

    // Fetch stories for titles
    const stories = storyIds.length > 0
      ? await this.database.selectRows<UserStoryRow>("user_stories", {
          filters: [{ operator: "in", column: "id", value: storyIds }],
        })
      : [];
    const storyMap = new Map(stories.map((s) => [s.id, s.title]));

    // Fetch assignments
    const assignments = taskIds.length > 0
      ? await this.database.selectRows<SprintTaskAssignmentRow>(
          "sprint_task_assignments",
          { filters: [{ operator: "in", column: "task_id", value: taskIds }] },
        )
      : [];
    const assignmentMap = new Map<string, string[]>();
    for (const a of assignments) {
      const list = assignmentMap.get(a.task_id) ?? [];
      list.push(a.user_id);
      assignmentMap.set(a.task_id, list);
    }

    // Fetch comment counts per task
    const comments = taskIds.length > 0
      ? await this.database.selectRows<TaskCommentRow>("task_comments", {
          filters: [{ operator: "in", column: "task_id", value: taskIds }],
        })
      : [];
    const commentCountMap = new Map<string, number>();
    for (const c of comments) {
      commentCountMap.set(c.task_id, (commentCountMap.get(c.task_id) ?? 0) + 1);
    }

    // Fetch agent notes (always scoped to project)
    const notes = taskIds.length > 0
      ? await this.database.selectRows<TaskAgentNoteRow>("task_agent_notes", {
          filters: [
            { operator: "in", column: "task_id", value: taskIds },
            { operator: "eq", column: "project_id", value: projectId },
          ],
          orderBy: { column: "created_on_utc", ascending: true },
        })
      : [];
    const notesMap = new Map<string, McpAgentNote[]>();
    for (const n of notes) {
      const list = notesMap.get(n.task_id) ?? [];
      list.push({ id: n.id, content: n.content, createdOnUtc: n.created_on_utc });
      notesMap.set(n.task_id, list);
    }

    return taskRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as McpTaskStatus,
      userStoryId: row.user_story_id,
      userStoryTitle: storyMap.get(row.user_story_id) ?? "Historia no disponible",
      assigneeIds: assignmentMap.get(row.id) ?? [],
      commentCount: commentCountMap.get(row.id) ?? 0,
      agentNotes: notesMap.get(row.id) ?? [],
    }));
  }

  private async runHandler<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const errName = error instanceof Error ? error.constructor.name : "";
      if (errName === "McpServiceError") throw error;
      if (errName === "ApplicationError" && error instanceof Error) {
        throw new McpServiceError("service_error", error.message);
      }
      throw error;
    }
  }

  private calculateProjectProgress(
    storyCount: number,
    tasks: SprintTaskRow[],
  ): number {
    if (storyCount === 0 || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return Math.round((completed * 100) / tasks.length);
  }
}
