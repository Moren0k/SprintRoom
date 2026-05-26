-- Fase 4A: Reforzar integridad de aislamiento por projectId en base de datos.
--
-- Objetivo: impedir relaciones cross-project invalidas a nivel de DB.
-- No se reemplaza la validacion en application layer; se agrega una red
-- de seguridad en la base de datos.
--
-- Estrategia: triggers en lugar de CHECK constraints porque PostgreSQL no
-- permite CHECK constraints que referencien otras tablas.
--
-- Se aplican dos reglas:
--   1. sprint_tasks.project_id DEBE coincidir con user_stories.project_id
--   2. task_agent_notes.project_id DEBE coincidir con sprint_tasks.project_id

-- ============================================================
-- Funcion auxiliar: reportar datos invalidos existentes
-- ============================================================
-- Ejecutar estas consultas ANTES de crear los triggers para detectar
-- datos existentes que violarian las nuevas reglas.
--
-- Query 1: sprint_tasks con project_id inconsistente respecto a user_stories
--   SELECT st.id AS sprint_task_id, st.project_id AS task_project_id,
--          us.id AS user_story_id, us.project_id AS story_project_id
--   FROM sprint_tasks st
--   JOIN user_stories us ON us.id = st.user_story_id
--   WHERE st.project_id <> us.project_id;
--
-- Query 2: task_agent_notes con project_id inconsistente respecto a sprint_tasks
--   SELECT tan.id AS note_id, tan.project_id AS note_project_id,
--          st.id AS task_id, st.project_id AS task_project_id
--   FROM task_agent_notes tan
--   JOIN sprint_tasks st ON st.id = tan.task_id
--   WHERE tan.project_id <> st.project_id;
--
-- Si estas consultas devuelven filas, revisa los datos antes de crear los
-- triggers. No se borran datos automaticamente.

-- ============================================================
-- Trigger 1: consistencia sprint_tasks.project_id
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_sprint_task_project_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  story_project_id uuid;
BEGIN
  SELECT project_id INTO story_project_id
  FROM user_stories
  WHERE id = NEW.user_story_id;

  IF story_project_id IS NULL THEN
    RAISE EXCEPTION 'La historia de usuario % no existe.', NEW.user_story_id
      USING HINT = 'user_story_id debe referenciar una historia existente.';
  END IF;

  IF NEW.project_id <> story_project_id THEN
    RAISE EXCEPTION 'sprint_tasks.project_id (%) no coincide con user_stories.project_id (%) para user_story_id %. La tarea perteneceria a un proyecto distinto a su historia.',
      NEW.project_id, story_project_id, NEW.user_story_id
      USING HINT = 'Asegurate de que project_id coincida con el proyecto de la historia de usuario.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sprint_task_project_consistency ON sprint_tasks;

CREATE TRIGGER trg_enforce_sprint_task_project_consistency
  BEFORE INSERT OR UPDATE OF project_id, user_story_id
  ON sprint_tasks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_sprint_task_project_consistency();

-- ============================================================
-- Trigger 2: consistencia task_agent_notes.project_id
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_agent_note_project_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  task_project_id uuid;
BEGIN
  SELECT project_id INTO task_project_id
  FROM sprint_tasks
  WHERE id = NEW.task_id;

  IF task_project_id IS NULL THEN
    RAISE EXCEPTION 'La tarea % no existe.', NEW.task_id
      USING HINT = 'task_id debe referenciar una tarea existente.';
  END IF;

  IF NEW.project_id <> task_project_id THEN
    RAISE EXCEPTION 'task_agent_notes.project_id (%) no coincide con sprint_tasks.project_id (%) para task_id %. La nota perteneceria a un proyecto distinto a su tarea.',
      NEW.project_id, task_project_id, NEW.task_id
      USING HINT = 'Asegurate de que project_id coincida con el proyecto de la tarea.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_agent_note_project_consistency ON task_agent_notes;

CREATE TRIGGER trg_enforce_agent_note_project_consistency
  BEFORE INSERT OR UPDATE OF project_id, task_id
  ON task_agent_notes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_agent_note_project_consistency();
