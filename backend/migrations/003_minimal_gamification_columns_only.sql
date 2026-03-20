-- ============================================================
-- 003: Colunas mínimas de gamificação (somente activities + todos)
-- Use quando o erro for "column ... xp_reward does not exist" e você
-- ainda não quiser rodar o 001 completo (achievements, seeds, RLS).
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- Depois, recomenda-se rodar 001 e 002 para alinhar tipos e seeds.
-- ============================================================

ALTER TABLE cdt_activities
  ADD COLUMN IF NOT EXISTS xp_reward numeric(10,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deadline_bonus_percent numeric(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS achievement_id uuid DEFAULT NULL;

ALTER TABLE cdt_project_todos
  ADD COLUMN IF NOT EXISTS xp_reward numeric(10,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS deadline date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS achievement_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deadline_bonus_percent numeric(5,2) NOT NULL DEFAULT 0.00;
