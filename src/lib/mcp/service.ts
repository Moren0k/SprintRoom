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
} from "./types";
import { getSprintroomMcpSkillPackage } from "./skill";

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
  constructor(private readonly database: InsForgeDatabaseGateway) {}

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
    // Load task with project filter
    const tasks = await this.database.selectRows<SprintTaskRow>("sprint_tasks", {
      filters: [
        { operator: "eq", column: "id", value: args.taskId },
        { operator: "eq", column: "project_id", value: projectId },
      ],
    });
    if (tasks.length === 0) {
      throw new McpServiceError(
        "task_not_found",
        "La tarea no existe o no pertenece a este proyecto.",
      );
    }
    const taskRow = tasks[0];

    // Load user story
    const story = await this.database.selectOne<UserStoryRow>("user_stories", [
      { operator: "eq", column: "id", value: taskRow.user_story_id },
    ]);

    // Load project for name
    const project = await this.database.selectOne<ProjectRow>("projects", [
      { operator: "eq", column: "id", value: projectId },
    ]);

    // Enrich with comments, assignments, notes
    const enriched = await this.enrichTasks([taskRow], projectId);

    return {
      task: {
        id: taskRow.id,
        title: taskRow.title,
        description: taskRow.description,
        status: taskRow.status as McpTaskStatus,
        assigneeIds: enriched.length > 0 ? enriched[0].assigneeIds : [],
        commentCount: enriched.length > 0 ? enriched[0].commentCount : 0,
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
    // Load current task (with project filter)
    const tasks = await this.database.selectRows<SprintTaskRow>("sprint_tasks", {
      filters: [
        { operator: "eq", column: "id", value: args.taskId },
        { operator: "eq", column: "project_id", value: projectId },
      ],
    });
    if (tasks.length === 0) {
      throw new McpServiceError(
        "task_not_found",
        "La tarea no existe o no pertenece a este proyecto.",
      );
    }

    const previousStatus = tasks[0].status as McpTaskStatus;

    // Update status
    await this.database.upsertRows(
      "sprint_tasks",
      [
        {
          id: args.taskId,
          status: args.status,
          is_completed: args.status === "completed",
          updated_on_utc: new Date().toISOString(),
        },
      ],
      { onConflict: "id" },
    );

    return {
      taskId: args.taskId,
      previousStatus,
      newStatus: args.status,
    };
  }

  /* ===================== add_task_agent_note ================== */

  async addTaskAgentNote(
    projectId: string,
    args: AddTaskAgentNoteArgs,
  ): Promise<McpNoteAddResult> {
    // Verify task exists and belongs to project
    const tasks = await this.database.selectRows<SprintTaskRow>("sprint_tasks", {
      filters: [
        { operator: "eq", column: "id", value: args.taskId },
        { operator: "eq", column: "project_id", value: projectId },
      ],
    });
    if (tasks.length === 0) {
      throw new McpServiceError(
        "task_not_found",
        "La tarea no existe o no pertenece a este proyecto.",
      );
    }

    const noteId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.database.insertRows("task_agent_notes", [
      {
        id: noteId,
        project_id: projectId,
        task_id: args.taskId,
        content: args.content,
        created_on_utc: now,
      },
    ]);

    return {
      noteId,
      taskId: args.taskId,
      content: args.content,
      createdOnUtc: now,
    };
  }

  /* ===================== get_sprintroom_mcp_skill ============= */

  async getSprintroomMcpSkill(
    _projectId: string,
    _args: GetSprintroomMcpSkillArgs,
  ): Promise<McpSkillPackage> {
    return getSprintroomMcpSkillPackage();
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

  private calculateProjectProgress(
    storyCount: number,
    tasks: SprintTaskRow[],
  ): number {
    if (storyCount === 0 || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return Math.round((completed * 100) / tasks.length);
  }
}
