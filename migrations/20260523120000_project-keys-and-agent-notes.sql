-- Project keys for MCP API key authentication
CREATE TABLE IF NOT EXISTS project_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_on_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add status column to sprint_tasks with granular states
ALTER TABLE sprint_tasks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'todo';
ALTER TABLE sprint_tasks DROP CONSTRAINT IF EXISTS sprint_task_status_check;
ALTER TABLE sprint_tasks ADD CONSTRAINT sprint_task_status_check CHECK (status IN ('todo', 'in_progress', 'done', 'blocked'));

-- Backfill existing data: map is_completed to status
UPDATE sprint_tasks SET status = 'done' WHERE is_completed = true AND status = 'todo';

-- Agent notes table for AI agent observations
CREATE TABLE IF NOT EXISTS task_agent_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES sprint_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_on_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_project_keys_key_hash ON project_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_project_keys_project_id ON project_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_task_agent_notes_task_id ON task_agent_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_agent_notes_project_id ON task_agent_notes(project_id);
