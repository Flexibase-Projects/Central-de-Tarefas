-- SSO central: vínculo explícito entre o usuário local do CDT e a identidade central.
-- Objetivos:
-- 1) preservar o `cdt_users.id` histórico;
-- 2) permitir autenticação via identidade central sem reescrever FKs legadas;
-- 3) habilitar rollout progressivo e reversível.

ALTER TABLE cdt_users
  ADD COLUMN IF NOT EXISTS central_user_id UUID NULL,
  ADD COLUMN IF NOT EXISTS identity_status TEXT NOT NULL DEFAULT 'legacy_only',
  ADD COLUMN IF NOT EXISTS last_identity_sync_at TIMESTAMPTZ NULL;

UPDATE cdt_users
SET identity_status = COALESCE(NULLIF(identity_status, ''), 'legacy_only')
WHERE identity_status IS NULL OR identity_status = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_users_identity_status_check'
  ) THEN
    ALTER TABLE cdt_users
      ADD CONSTRAINT cdt_users_identity_status_check
      CHECK (
        identity_status IN (
          'legacy_only',
          'linked',
          'manual_review',
          'conflict',
          'disabled'
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cdt_users_central_user_id
  ON cdt_users (central_user_id)
  WHERE central_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cdt_users_identity_status
  ON cdt_users (identity_status);

CREATE INDEX IF NOT EXISTS idx_cdt_users_last_identity_sync_at
  ON cdt_users (last_identity_sync_at DESC NULLS LAST);
