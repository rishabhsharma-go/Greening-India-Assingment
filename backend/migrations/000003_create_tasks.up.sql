CREATE TABLE IF NOT EXISTS tasks (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT        NOT NULL,
    description TEXT,
    status      TEXT        NOT NULL DEFAULT 'todo'
                            CHECK (status IN ('todo', 'in_progress', 'done')),
    priority    TEXT        NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('low', 'medium', 'high')),
    project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id UUID        REFERENCES users(id) ON DELETE SET NULL,
    due_date    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id  ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);
