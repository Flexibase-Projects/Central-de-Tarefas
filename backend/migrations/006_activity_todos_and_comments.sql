-- TO-DOs por atividade (sem projeto obrigatório) e comentários por atividade
-- (espelha o que foi aplicado via MCP; manter versionado no repositório)

ALTER TABLE cdt_project_todos ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES cdt_activities(id) ON DELETE CASCADE;
ALTER TABLE cdt_project_todos ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE cdt_project_todos DROP CONSTRAINT IF EXISTS cdt_project_todos_one_scope;
ALTER TABLE cdt_project_todos ADD CONSTRAINT cdt_project_todos_one_scope CHECK (
  (project_id IS NOT NULL AND activity_id IS NULL) OR
  (project_id IS NULL AND activity_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_cdt_project_todos_activity_id ON cdt_project_todos(activity_id);

ALTER TABLE cdt_comments ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES cdt_activities(id) ON DELETE CASCADE;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'cdt_comments' AND c.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE cdt_comments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE cdt_comments ADD CONSTRAINT cdt_comments_one_parent CHECK (
  (project_id IS NOT NULL AND task_id IS NULL AND activity_id IS NULL) OR
  (project_id IS NULL AND task_id IS NOT NULL AND activity_id IS NULL) OR
  (project_id IS NULL AND task_id IS NULL AND activity_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_cdt_comments_activity_id ON cdt_comments(activity_id);
