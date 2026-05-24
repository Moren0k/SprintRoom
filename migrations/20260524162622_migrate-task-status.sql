-- Step 1: Drop old check constraint
ALTER TABLE sprint_tasks DROP CONSTRAINT IF EXISTS sprint_task_status_check;

-- Step 2: Migrate status values from old enum to new 5-state enum
-- Old: todo, in_progress, done, blocked
-- New: not_started, in_progress, testing, review, completed
UPDATE sprint_tasks
SET
  status = CASE
    WHEN status = 'todo' THEN 'not_started'
    WHEN status = 'done' THEN 'completed'
    WHEN status = 'blocked' THEN 'not_started'
    ELSE status
  END,
  is_completed = CASE
    WHEN status = 'done' THEN true
    WHEN status = 'completed' THEN true
    ELSE false
  END;

-- Step 3: Add new check constraint
ALTER TABLE sprint_tasks ADD CONSTRAINT sprint_task_status_check
  CHECK (status = ANY (ARRAY['not_started', 'in_progress', 'testing', 'review', 'completed']));

-- Step 4: Update default value
ALTER TABLE sprint_tasks ALTER COLUMN status SET DEFAULT 'not_started';
