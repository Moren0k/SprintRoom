-- ──────────────────────────────────────────────
-- Realtime: task status changes via InsForge Realtime
-- Canal: project:{projectId}:tasks
-- Evento: task_status_changed
-- ──────────────────────────────────────────────

-- 1. Crear patron de canal en realtime.channels
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('project:%:tasks', 'Cambios de estado de tareas por proyecto', true)
ON CONFLICT (pattern) DO NOTHING;

-- 2. Funcion trigger que publica el evento
CREATE OR REPLACE FUNCTION notify_task_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'project:' || NEW.project_id || ':tasks',
    'task_status_changed',
    jsonb_build_object(
      'projectId', NEW.project_id,
      'taskId', NEW.id,
      'userStoryId', NEW.user_story_id,
      'status', NEW.status,
      'isCompleted', NEW.is_completed,
      'updatedOnUtc', NEW.updated_on_utc
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Adjuntar trigger solo cuando el status cambia
DROP TRIGGER IF EXISTS task_status_changed_trigger ON sprint_tasks;
CREATE TRIGGER task_status_changed_trigger
  AFTER UPDATE ON sprint_tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_task_status_changed();

-- 4. RLS en realtime.channels (idempotente)
ALTER TABLE IF EXISTS realtime.channels ENABLE ROW LEVEL SECURITY;

-- 5. Solo miembros del proyecto pueden suscribirse
DROP POLICY IF EXISTS project_members_subscribe_task_changes ON realtime.channels;
CREATE POLICY project_members_subscribe_task_changes
ON realtime.channels FOR SELECT
TO authenticated
USING (
  pattern LIKE 'project:%:tasks'
  AND EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = NULLIF(split_part(realtime.channel_name(), ':', 2), '')::uuid
      AND user_id = auth.uid()
  )
);

-- 6. Solo el sistema (trigger SECURITY DEFINER) puede publicar en estos canales
DROP POLICY IF EXISTS trigger_only_publish_task_changes ON realtime.messages;
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY trigger_only_publish_task_changes
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (
  channel_name LIKE 'project:%:tasks'
  AND EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = NULLIF(split_part(channel_name, ':', 2), '')::uuid
      AND user_id = auth.uid()
  )
);
