-- Cleanup redundant FK indexes after validating the live PostgreSQL schema.
--
-- InsForge Backend Advisor currently reports performance/missing-fk-index
-- warnings for these columns, but direct pg_catalog checks confirmed false
-- positives: every reported FK remains covered either by an existing btree
-- index or by a composite primary key where the FK column is the leftmost
-- prefix, for example (project_id, user_id) and (task_id, user_id).
--
-- retained_task_comments.retained_by is intentionally kept. It exists in the
-- schema migration, TypeScript row types, persistence code, FK metadata, and
-- live data. This statement records the intended supporting FK index in the
-- migration history without changing the domain model.
CREATE INDEX IF NOT EXISTS idx_retained_task_comments_retained_by
ON public.retained_task_comments(retained_by);

-- Remove only indexes confirmed as exact duplicates or redundant with a PK
-- prefix. This does not drop primary keys, unique indexes, or constraint-owned
-- indexes, and it does not remove any non-confirmed index.
DROP INDEX IF EXISTS public.idx_projects_owner_id;
DROP INDEX IF EXISTS public.idx_project_members_project_id;
DROP INDEX IF EXISTS public.idx_user_stories_project_id;
DROP INDEX IF EXISTS public.idx_sprint_tasks_project_id;
DROP INDEX IF EXISTS public.idx_sprint_tasks_user_story_id;
DROP INDEX IF EXISTS public.idx_sprint_task_assignments_task_id;
DROP INDEX IF EXISTS public.idx_task_comments_task_id;
DROP INDEX IF EXISTS public.idx_audit_events_actor_id;
DROP INDEX IF EXISTS public.idx_retained_task_comments_author_id;

-- Manual rollback, if needed:
-- CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
-- CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
-- CREATE INDEX IF NOT EXISTS idx_user_stories_project_id ON public.user_stories(project_id);
-- CREATE INDEX IF NOT EXISTS idx_sprint_tasks_project_id ON public.sprint_tasks(project_id);
-- CREATE INDEX IF NOT EXISTS idx_sprint_tasks_user_story_id ON public.sprint_tasks(user_story_id);
-- CREATE INDEX IF NOT EXISTS idx_sprint_task_assignments_task_id ON public.sprint_task_assignments(task_id);
-- CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
-- CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id ON public.audit_events(actor_id);
-- CREATE INDEX IF NOT EXISTS idx_retained_task_comments_author_id ON public.retained_task_comments(author_id);
