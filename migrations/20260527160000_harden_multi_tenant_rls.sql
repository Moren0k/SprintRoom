-- Harden multi-tenant read access so browser-visible user tokens cannot
-- enumerate cross-project data through PostgREST.

CREATE OR REPLACE FUNCTION public.request_user_can_access_project(
  p_project_id uuid,
  p_roles integer[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.request_user_id() IS NOT NULL
    AND (
      public.request_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.project_members
        WHERE project_id = p_project_id
          AND user_id = public.request_user_id()
          AND (p_roles IS NULL OR role = ANY(p_roles))
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.request_user_can_access_project(uuid, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_user_can_access_project(uuid, integer[]) TO anon;

CREATE OR REPLACE FUNCTION public.request_user_can_access_story(
  p_user_story_id uuid,
  p_roles integer[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_stories
    WHERE id = p_user_story_id
      AND public.request_user_can_access_project(project_id, p_roles)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.request_user_can_access_story(uuid, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_user_can_access_story(uuid, integer[]) TO anon;

CREATE OR REPLACE FUNCTION public.request_user_can_access_task(
  p_task_id uuid,
  p_roles integer[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sprint_tasks
    WHERE id = p_task_id
      AND public.request_user_can_access_project(project_id, p_roles)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.request_user_can_access_task(uuid, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_user_can_access_task(uuid, integer[]) TO anon;

-- users: self-only because the table contains password hashes.
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
CREATE POLICY "users_select_self_only" ON public.users
  FOR SELECT TO anon
  USING (public.request_user_id() = id);

-- projects: only visible to members or internal admins.
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select_visible_members" ON public.projects
  FOR SELECT TO anon
  USING (public.request_user_can_access_project(id));

DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert_self_owner" ON public.projects
  FOR INSERT TO anon
  WITH CHECK (
    public.request_user_id() IS NOT NULL
    AND (
      public.request_user_is_admin()
      OR owner_id = public.request_user_id()
    )
  );

DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
CREATE POLICY "project_members_insert_manage_members" ON public.project_members
  FOR INSERT TO anon
  WITH CHECK (public.request_user_can_access_project(project_id, ARRAY[3, 4]));

-- project membership is private to the project.
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
CREATE POLICY "project_members_select_visible_members" ON public.project_members
  FOR SELECT TO anon
  USING (public.request_user_can_access_project(project_id));

-- user stories are visible only inside visible projects.
DROP POLICY IF EXISTS "user_stories_select" ON public.user_stories;
CREATE POLICY "user_stories_select_visible_members" ON public.user_stories
  FOR SELECT TO anon
  USING (public.request_user_can_access_project(project_id));

-- sprint tasks are visible only inside visible projects.
DROP POLICY IF EXISTS "sprint_tasks_select" ON public.sprint_tasks;
CREATE POLICY "sprint_tasks_select_visible_members" ON public.sprint_tasks
  FOR SELECT TO anon
  USING (public.request_user_can_access_project(project_id));

-- task assignments follow their parent task visibility.
DROP POLICY IF EXISTS "sta_select" ON public.sprint_task_assignments;
CREATE POLICY "sta_select_visible_members" ON public.sprint_task_assignments
  FOR SELECT TO anon
  USING (public.request_user_can_access_task(task_id));

DROP POLICY IF EXISTS "sta_insert" ON public.sprint_task_assignments;
CREATE POLICY "sta_insert_contributors" ON public.sprint_task_assignments
  FOR INSERT TO anon
  WITH CHECK (public.request_user_can_access_task(task_id, ARRAY[2, 3, 4]));

DROP POLICY IF EXISTS "sta_delete" ON public.sprint_task_assignments;
CREATE POLICY "sta_delete_contributors" ON public.sprint_task_assignments
  FOR DELETE TO anon
  USING (public.request_user_can_access_task(task_id, ARRAY[2, 3, 4]));

-- task comments follow their parent task visibility.
DROP POLICY IF EXISTS "task_comments_select" ON public.task_comments;
CREATE POLICY "task_comments_select_visible_members" ON public.task_comments
  FOR SELECT TO anon
  USING (public.request_user_can_access_task(task_id));

DROP POLICY IF EXISTS "task_comments_insert" ON public.task_comments;
CREATE POLICY "task_comments_insert_visible_members" ON public.task_comments
  FOR INSERT TO anon
  WITH CHECK (
    author_id = public.request_user_id()
    AND public.request_user_can_access_task(task_id)
  );

-- project-scoped agent notes are visible only to project members.
DROP POLICY IF EXISTS "task_agent_notes_select" ON public.task_agent_notes;
CREATE POLICY "task_agent_notes_select_visible_members" ON public.task_agent_notes
  FOR SELECT TO anon
  USING (public.request_user_can_access_project(project_id));

DROP POLICY IF EXISTS "task_agent_notes_insert" ON public.task_agent_notes;
CREATE POLICY "task_agent_notes_insert_contributors" ON public.task_agent_notes
  FOR INSERT TO anon
  WITH CHECK (public.request_user_can_access_project(project_id, ARRAY[2, 3, 4]));

-- audit events are only visible within their project scope.
DROP POLICY IF EXISTS "audit_events_select" ON public.audit_events;
CREATE POLICY "audit_events_select_visible_members" ON public.audit_events
  FOR SELECT TO anon
  USING (
    project_id IS NOT NULL
    AND public.request_user_can_access_project(project_id)
  );

DROP POLICY IF EXISTS "audit_events_insert" ON public.audit_events;
CREATE POLICY "audit_events_insert_visible_members" ON public.audit_events
  FOR INSERT TO anon
  WITH CHECK (
    actor_id = public.request_user_id()
    AND (
      project_id IS NULL
      OR public.request_user_can_access_project(project_id)
    )
  );

-- retained comments are internal records; do not expose them directly to browser/user tokens.
DROP POLICY IF EXISTS "retained_task_comments_select" ON public.retained_task_comments;
CREATE POLICY "retained_task_comments_select_denied" ON public.retained_task_comments
  FOR SELECT TO anon
  USING (false);

DROP POLICY IF EXISTS "retained_task_comments_insert" ON public.retained_task_comments;
CREATE POLICY "retained_task_comments_insert_denied" ON public.retained_task_comments
  FOR INSERT TO anon
  WITH CHECK (false);
