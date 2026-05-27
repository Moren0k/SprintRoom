CREATE OR REPLACE FUNCTION public.request_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = public.request_user_id()
      AND system_role = 2
  );
$$;

REVOKE EXECUTE ON FUNCTION public.request_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_user_is_admin() TO anon;

CREATE OR REPLACE FUNCTION public.request_user_has_project_role(
  p_project_id uuid,
  p_roles integer[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = public.request_user_id()
      AND role = ANY(p_roles)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.request_user_has_project_role(uuid, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_user_has_project_role(uuid, integer[]) TO anon;

CREATE OR REPLACE FUNCTION public.save_project_bundle(
  p_project jsonb,
  p_members jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_project_id uuid := (p_project->>'id')::uuid;
  v_owner_id uuid := (p_project->>'owner_id')::uuid;
  v_project_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project_id)
  INTO v_project_exists;

  IF v_project_exists THEN
    IF NOT (
      public.request_user_is_admin()
      OR public.request_user_has_project_role(v_project_id, ARRAY[3, 4])
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to update project %.', v_project_id;
    END IF;
  ELSE
    IF v_owner_id IS DISTINCT FROM v_user_id AND NOT public.request_user_is_admin() THEN
      RAISE EXCEPTION 'The current user cannot create a project for another owner.';
    END IF;
  END IF;

  INSERT INTO public.projects (
    id,
    name,
    description,
    external_reference,
    owner_id,
    created_on_utc,
    updated_on_utc
  )
  VALUES (
    (p_project->>'id')::uuid,
    p_project->>'name',
    p_project->>'description',
    p_project->>'external_reference',
    (p_project->>'owner_id')::uuid,
    (p_project->>'created_on_utc')::timestamptz,
    (p_project->>'updated_on_utc')::timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    external_reference = EXCLUDED.external_reference,
    owner_id = EXCLUDED.owner_id,
    created_on_utc = EXCLUDED.created_on_utc,
    updated_on_utc = EXCLUDED.updated_on_utc;

  DELETE FROM public.project_members
  WHERE project_id = v_project_id;

  INSERT INTO public.project_members (
    project_id,
    user_id,
    role,
    joined_on_utc
  )
  SELECT
    member.project_id,
    member.user_id,
    member.role,
    member.joined_on_utc
  FROM jsonb_to_recordset(COALESCE(p_members, '[]'::jsonb)) AS member(
    project_id uuid,
    user_id uuid,
    role smallint,
    joined_on_utc timestamptz
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_project_bundle(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_project_bundle(jsonb, jsonb) TO anon;

CREATE OR REPLACE FUNCTION public.save_sprint_task_bundle(
  p_task jsonb,
  p_assignments jsonb DEFAULT '[]'::jsonb,
  p_comments jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_task_id uuid := (p_task->>'id')::uuid;
  v_project_id uuid := (p_task->>'project_id')::uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT (
    public.request_user_is_admin()
    OR public.request_user_has_project_role(v_project_id, ARRAY[2, 3, 4])
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to write sprint task %.', v_task_id;
  END IF;

  INSERT INTO public.sprint_tasks (
    id,
    project_id,
    user_story_id,
    title,
    description,
    is_completed,
    status,
    created_on_utc,
    updated_on_utc
  )
  VALUES (
    v_task_id,
    v_project_id,
    (p_task->>'user_story_id')::uuid,
    p_task->>'title',
    p_task->>'description',
    COALESCE((p_task->>'is_completed')::boolean, false),
    p_task->>'status',
    (p_task->>'created_on_utc')::timestamptz,
    (p_task->>'updated_on_utc')::timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    user_story_id = EXCLUDED.user_story_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    is_completed = EXCLUDED.is_completed,
    status = EXCLUDED.status,
    created_on_utc = EXCLUDED.created_on_utc,
    updated_on_utc = EXCLUDED.updated_on_utc;

  DELETE FROM public.sprint_task_assignments
  WHERE task_id = v_task_id;

  INSERT INTO public.sprint_task_assignments (task_id, user_id)
  SELECT assignment.task_id, assignment.user_id
  FROM jsonb_to_recordset(COALESCE(p_assignments, '[]'::jsonb)) AS assignment(
    task_id uuid,
    user_id uuid
  );

  INSERT INTO public.task_comments (
    id,
    task_id,
    author_id,
    body,
    created_on_utc
  )
  SELECT
    comment.id,
    comment.task_id,
    comment.author_id,
    comment.body,
    comment.created_on_utc
  FROM jsonb_to_recordset(COALESCE(p_comments, '[]'::jsonb)) AS comment(
    id uuid,
    task_id uuid,
    author_id uuid,
    body text,
    created_on_utc timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    task_id = EXCLUDED.task_id,
    author_id = EXCLUDED.author_id,
    body = EXCLUDED.body,
    created_on_utc = EXCLUDED.created_on_utc;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_sprint_task_bundle(jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_sprint_task_bundle(jsonb, jsonb, jsonb) TO anon;

CREATE OR REPLACE FUNCTION public.delete_sprint_task_bundle(
  p_task_id uuid,
  p_retained_comments jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_project_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT project_id INTO v_project_id
  FROM public.sprint_tasks
  WHERE id = p_task_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Sprint task % does not exist.', p_task_id;
  END IF;

  IF NOT (
    public.request_user_is_admin()
    OR public.request_user_has_project_role(v_project_id, ARRAY[3, 4])
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to delete sprint task %.', p_task_id;
  END IF;

  INSERT INTO public.retained_task_comments (
    comment_id,
    task_id,
    author_id,
    body,
    created_on_utc,
    retained_on_utc,
    retained_by,
    reason
  )
  SELECT
    comment.comment_id,
    comment.task_id,
    comment.author_id,
    comment.body,
    comment.created_on_utc,
    comment.retained_on_utc,
    comment.retained_by,
    comment.reason
  FROM jsonb_to_recordset(COALESCE(p_retained_comments, '[]'::jsonb)) AS comment(
    comment_id uuid,
    task_id uuid,
    author_id uuid,
    body text,
    created_on_utc timestamptz,
    retained_on_utc timestamptz,
    retained_by uuid,
    reason text
  )
  ON CONFLICT (comment_id) DO UPDATE SET
    task_id = EXCLUDED.task_id,
    author_id = EXCLUDED.author_id,
    body = EXCLUDED.body,
    created_on_utc = EXCLUDED.created_on_utc,
    retained_on_utc = EXCLUDED.retained_on_utc,
    retained_by = EXCLUDED.retained_by,
    reason = EXCLUDED.reason;

  DELETE FROM public.sprint_tasks
  WHERE id = p_task_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_sprint_task_bundle(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_sprint_task_bundle(uuid, jsonb) TO anon;

CREATE OR REPLACE FUNCTION public.delete_user_story_bundle(
  p_user_story_id uuid,
  p_retained_comments jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_project_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT project_id INTO v_project_id
  FROM public.user_stories
  WHERE id = p_user_story_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'User story % does not exist.', p_user_story_id;
  END IF;

  IF NOT (
    public.request_user_is_admin()
    OR public.request_user_has_project_role(v_project_id, ARRAY[3, 4])
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to delete user story %.', p_user_story_id;
  END IF;

  INSERT INTO public.retained_task_comments (
    comment_id,
    task_id,
    author_id,
    body,
    created_on_utc,
    retained_on_utc,
    retained_by,
    reason
  )
  SELECT
    comment.comment_id,
    comment.task_id,
    comment.author_id,
    comment.body,
    comment.created_on_utc,
    comment.retained_on_utc,
    comment.retained_by,
    comment.reason
  FROM jsonb_to_recordset(COALESCE(p_retained_comments, '[]'::jsonb)) AS comment(
    comment_id uuid,
    task_id uuid,
    author_id uuid,
    body text,
    created_on_utc timestamptz,
    retained_on_utc timestamptz,
    retained_by uuid,
    reason text
  )
  ON CONFLICT (comment_id) DO UPDATE SET
    task_id = EXCLUDED.task_id,
    author_id = EXCLUDED.author_id,
    body = EXCLUDED.body,
    created_on_utc = EXCLUDED.created_on_utc,
    retained_on_utc = EXCLUDED.retained_on_utc,
    retained_by = EXCLUDED.retained_by,
    reason = EXCLUDED.reason;

  DELETE FROM public.sprint_tasks
  WHERE user_story_id = p_user_story_id;

  DELETE FROM public.user_stories
  WHERE id = p_user_story_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_story_bundle(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_story_bundle(uuid, jsonb) TO anon;

CREATE OR REPLACE FUNCTION public.delete_project_bundle(
  p_project_id uuid,
  p_retained_comments jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT (
    public.request_user_is_admin()
    OR public.request_user_has_project_role(p_project_id, ARRAY[4])
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to delete project %.', p_project_id;
  END IF;

  INSERT INTO public.retained_task_comments (
    comment_id,
    task_id,
    author_id,
    body,
    created_on_utc,
    retained_on_utc,
    retained_by,
    reason
  )
  SELECT
    comment.comment_id,
    comment.task_id,
    comment.author_id,
    comment.body,
    comment.created_on_utc,
    comment.retained_on_utc,
    comment.retained_by,
    comment.reason
  FROM jsonb_to_recordset(COALESCE(p_retained_comments, '[]'::jsonb)) AS comment(
    comment_id uuid,
    task_id uuid,
    author_id uuid,
    body text,
    created_on_utc timestamptz,
    retained_on_utc timestamptz,
    retained_by uuid,
    reason text
  )
  ON CONFLICT (comment_id) DO UPDATE SET
    task_id = EXCLUDED.task_id,
    author_id = EXCLUDED.author_id,
    body = EXCLUDED.body,
    created_on_utc = EXCLUDED.created_on_utc,
    retained_on_utc = EXCLUDED.retained_on_utc,
    retained_by = EXCLUDED.retained_by,
    reason = EXCLUDED.reason;

  DELETE FROM public.sprint_tasks
  WHERE project_id = p_project_id;

  DELETE FROM public.user_stories
  WHERE project_id = p_project_id;

  DELETE FROM public.projects
  WHERE id = p_project_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_project_bundle(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_project_bundle(uuid, jsonb) TO anon;
