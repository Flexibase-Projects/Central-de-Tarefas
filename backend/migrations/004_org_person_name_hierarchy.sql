-- Organograma: hierarquia por id da linha (reports_to_id → cdt_user_org.id) e nome livre (person_name).
-- Execute no Supabase após 003 se a tabela ainda tiver coluna user_id.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cdt_user_org' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE cdt_user_org DROP CONSTRAINT IF EXISTS cdt_user_org_no_self_report;

    ALTER TABLE cdt_user_org ADD COLUMN IF NOT EXISTS person_name VARCHAR(255);
    UPDATE cdt_user_org ou
    SET person_name = COALESCE(
      (SELECT cu.name FROM cdt_users cu WHERE cu.id = ou.user_id),
      'Sem nome'
    )
    WHERE person_name IS NULL OR TRIM(person_name) = '';

    ALTER TABLE cdt_user_org ALTER COLUMN person_name SET NOT NULL;

    ALTER TABLE cdt_user_org ADD COLUMN IF NOT EXISTS reports_to_org_entry_id UUID REFERENCES cdt_user_org(id) ON DELETE SET NULL;

    UPDATE cdt_user_org child
    SET reports_to_org_entry_id = parent.id
    FROM cdt_user_org parent
    WHERE child.reports_to_id IS NOT NULL AND parent.user_id = child.reports_to_id;

    ALTER TABLE cdt_user_org DROP CONSTRAINT IF EXISTS cdt_user_org_reports_to_id_fkey;
    DROP INDEX IF EXISTS idx_cdt_user_org_reports_to;
    ALTER TABLE cdt_user_org DROP COLUMN IF EXISTS reports_to_id;
    ALTER TABLE cdt_user_org RENAME COLUMN reports_to_org_entry_id TO reports_to_id;

    CREATE INDEX IF NOT EXISTS idx_cdt_user_org_reports_to ON cdt_user_org(reports_to_id);

    ALTER TABLE cdt_user_org DROP CONSTRAINT IF EXISTS cdt_user_org_user_id_key;
    ALTER TABLE cdt_user_org DROP CONSTRAINT IF EXISTS cdt_user_org_user_id_fkey;
    ALTER TABLE cdt_user_org DROP COLUMN user_id;

    ALTER TABLE cdt_user_org ADD CONSTRAINT cdt_user_org_no_self_report
      CHECK (reports_to_id IS NULL OR reports_to_id <> id);
  END IF;
END $$;
