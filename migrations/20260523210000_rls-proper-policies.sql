-- ============================================================
-- Fix all 26 InsForge Backend Advisor RLS issues
-- ============================================================

-- ── Helper: get current user ID from PostgREST SET header ──
CREATE OR REPLACE FUNCTION public.request_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid;
$$;

-- ── Helper: check project membership (uses caller RLS) ────────
-- SECURITY INVOKER avoids owner-privilege escalation while still
-- allowing policies to read public.project_members via its RLS rules.
CREATE OR REPLACE FUNCTION public.is_project_member(
  p_user_id uuid,
  p_project_id uuid,
  p_roles integer[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = p_user_id
      AND project_id = p_project_id
      AND (p_roles IS NULL OR role = ANY(p_roles))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid, uuid, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid, integer[]) TO anon;

-- ── Issues 1-4: Enable RLS on unprotected tables ───────────
ALTER TABLE IF EXISTS public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_events FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.retained_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.retained_task_comments FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.project_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_keys FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.task_agent_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_agent_notes FORCE ROW LEVEL SECURITY;

-- ── Drop all existing permissive policies ───────────────────
DROP POLICY IF EXISTS "Users can read user rows" ON public.users;
DROP POLICY IF EXISTS "Users can be created" ON public.users;
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
DROP POLICY IF EXISTS "Members can read project members" ON public.project_members;
DROP POLICY IF EXISTS "Members can be added" ON public.project_members;
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
DROP POLICY IF EXISTS "user_stories_select" ON public.user_stories;
DROP POLICY IF EXISTS "user_stories_insert" ON public.user_stories;
DROP POLICY IF EXISTS "user_stories_update" ON public.user_stories;
DROP POLICY IF EXISTS "user_stories_delete" ON public.user_stories;
DROP POLICY IF EXISTS "sprint_tasks_select" ON public.sprint_tasks;
DROP POLICY IF EXISTS "sprint_tasks_insert" ON public.sprint_tasks;
DROP POLICY IF EXISTS "sprint_tasks_update" ON public.sprint_tasks;
DROP POLICY IF EXISTS "sprint_tasks_delete" ON public.sprint_tasks;
DROP POLICY IF EXISTS "sta_select" ON public.sprint_task_assignments;
DROP POLICY IF EXISTS "sta_insert" ON public.sprint_task_assignments;
DROP POLICY IF EXISTS "sta_delete" ON public.sprint_task_assignments;
DROP POLICY IF EXISTS "task_comments_select" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_insert" ON public.task_comments;

-- ── New policies ────────────────────────────────────────────
-- Roles: 1=viewer, 2=contributor, 3=maintainer, 4=owner

-- ==================== users ====================
-- Login/register use admin key (via INSFORGE_API_KEY),
-- so no permissive anon policies needed.
-- Authenticated users can read other users (e.g. member list, assignees)
CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT TO anon USING (request_user_id() IS NOT NULL);

-- Profile updates: only the user themselves
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE TO anon
  USING (request_user_id() = id)
  WITH CHECK (request_user_id() = id);

-- ==================== projects ====================
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO anon
  USING (request_user_id() IS NOT NULL);

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO anon
  WITH CHECK (request_user_id() IS NOT NULL);

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO anon
  USING (public.is_project_member(request_user_id(), id, ARRAY[3, 4]))
  WITH CHECK (public.is_project_member(request_user_id(), id, ARRAY[3, 4]));

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO anon
  USING (public.is_project_member(request_user_id(), id, ARRAY[4]));

-- ==================== project_members ====================
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT TO anon
  USING (request_user_id() IS NOT NULL);

CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT TO anon
  WITH CHECK (public.is_project_member(request_user_id(), project_id, ARRAY[3, 4]));

-- ==================== user_stories ====================
CREATE POLICY "user_stories_select" ON public.user_stories
  FOR SELECT TO anon
  USING (request_user_id() IS NOT NULL);

CREATE POLICY "user_stories_insert" ON public.user_stories
  FOR INSERT TO anon
  WITH CHECK (public.is_project_member(request_user_id(), project_id, ARRAY[2, 3, 4]));

CREATE POLICY "user_stories_update" ON public.user_stories
  FOR UPDATE TO anon
  USING (public.is_project_member(request_user_id(), project_id, ARRAY[2, 3, 4]))
  WITH CHECK (public.is_project_member(request_user_id(), project_id, ARRAY[2, 3, 4]));

CREATE POLICY "user_stories_delete" ON public.user_stories
  FOR DELETE TO anon
  USING (public.is_project_member(request_user_id(), project_id, ARRAY[3, 4]));

-- ==================== sprint_tasks ====================
CREATE POLICY "sprint_tasks_select" ON public.sprint_tasks
  FOR SELECT TO anon
  USING (request_user_id() IS NOT NULL);

CREATE POLICY "sprint_tasks_insert" ON public.sprint_tasks
  FOR INSERT TO anon
  WITH CHECK (public.is_project_member(request_user_id(), project_id, ARRAY[2, 3, 4]));

CREATE POLICY "sprint_tasks_update" ON public.sprint_tasks
  FOR UPDATE TO anon
  USING (public.is_project_member(request_user_id(), project_id, ARRAY[2, 3, 4]))
  WITH CHECK (public.is_project_member(request_user_id(), project_id, ARRAY[2, 3, 4]));

CREATE POLICY "sprint_tasks_delete" ON public.sprint_tasks
  FOR DELETE TO anon
  USING (public.is_project_member(request_user_id(), project_id, ARRAY[3, 4]));

-- ==================== sprint_task_assignments ====================
CREATE POLICY "sta_select" ON public.sprint_task_assignments
  FOR SELECT TO anon
  USING (request_user_id() IS NOT NULL);

CREATE POLICY "sta_insert" ON public.sprint_task_assignments
  FOR INSERT TO anon
  WITH CHECK (request_user_id() IS NOT NULL);

CREATE POLICY "sta_delete" ON public.sprint_task_assignments
  FOR DELETE TO anon
  USING (request_user_id() IS NOT NULL);

-- ==================== task_comments ====================
CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT TO anon
  USING (request_user_id() IS NOT NULL);

CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT TO anon
  WITH CHECK (request_user_id() IS NOT NULL);

-- ==================== project_keys ====================
CREATE POLICY "project_keys_select" ON public.project_keys
  FOR SELECT TO anon
  USING (public.is_project_member(request_user_id(), project_id, ARRAY[3, 4]));

CREATE POLICY "project_keys_insert" ON public.project_keys
  FOR INSERT TO anon
  WITH CHECK (public.is_project_member(request_user_id(), project_id, ARRAY[3, 4]));

CREATE POLICY "project_keys_delete" ON public.project_keys
  FOR DELETE TO anon
  USING (public.is_project_member(request_user_id(), project_id, ARRAY[4]));

-- ==================== task_agent_notes ====================
CREATE POLICY "task_agent_notes_select" ON public.task_agent_notes
  FOR SELECT TO anon
  USING (request_user_id() IS NOT NULL);

CREATE POLICY "task_agent_notes_insert" ON public.task_agent_notes
  FOR INSERT TO anon
  WITH CHECK (request_user_id() IS NOT NULL);

-- ==================== audit_events ====================
CREATE POLICY "audit_events_insert" ON public.audit_events
  FOR INSERT TO anon
  WITH CHECK (request_user_id() IS NOT NULL);

CREATE POLICY "audit_events_select" ON public.audit_events
  FOR SELECT TO anon
  USING (request_user_id() IS NOT NULL);

-- ==================== retained_task_comments ====================
CREATE POLICY "retained_task_comments_select" ON public.retained_task_comments
  FOR SELECT TO anon
  USING (request_user_id() IS NOT NULL);

CREATE POLICY "retained_task_comments_insert" ON public.retained_task_comments
  FOR INSERT TO anon
  WITH CHECK (request_user_id() IS NOT NULL);
