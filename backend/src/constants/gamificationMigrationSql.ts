/**
 * SQL idempotente para adicionar colunas de gamificação quando 001/002 ainda não foram aplicadas.
 * Deve ser idêntico ao conteúdo de backend/migrations/003_minimal_gamification_columns_only.sql
 */
export const GAMIFICATION_QUICK_FIX_SQL = `-- Correção rápida (idempotente): cole no Supabase → SQL Editor → Run

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
`;

export function gamificationMigration503Payload() {
  return {
    error:
      'Colunas de gamificação ausentes no banco. Execute o SQL de correção rápida (quickFixSql) no Supabase ou rode as migrações 001 e 002 em backend/migrations.',
    code: 'MIGRATION_REQUIRED' as const,
    migrations: ['001_gamification.sql', '002_gamification_decimal_admin.sql'],
    quickFixSql: GAMIFICATION_QUICK_FIX_SQL,
  };
}
