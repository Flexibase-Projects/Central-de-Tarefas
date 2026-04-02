CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cdt_workspace_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES cdt_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES cdt_users(id) ON DELETE CASCADE,
  display_name VARCHAR(200) NULL,
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL REFERENCES cdt_users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES cdt_users(id) ON DELETE SET NULL,
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_user_profiles_workspace_id
  ON cdt_workspace_user_profiles (workspace_id);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_user_profiles_user_id
  ON cdt_workspace_user_profiles (user_id);

ALTER TABLE cdt_user_xp_log
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE cdt_user_achievements
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

WITH xp_workspace AS (
  SELECT
    xp.id,
    COALESCE(todo.workspace_id, activity.workspace_id) AS resolved_workspace_id
  FROM cdt_user_xp_log xp
  LEFT JOIN cdt_project_todos todo
    ON xp.related_type = 'todo'
   AND xp.related_id = todo.id
  LEFT JOIN cdt_activities activity
    ON xp.related_type = 'activity'
   AND xp.related_id = activity.id
)
UPDATE cdt_user_xp_log xp
SET workspace_id = xp_workspace.resolved_workspace_id
FROM xp_workspace
WHERE xp.id = xp_workspace.id
  AND xp.workspace_id IS NULL
  AND xp_workspace.resolved_workspace_id IS NOT NULL;

UPDATE cdt_user_xp_log xp
SET workspace_id = COALESCE(
  (
    SELECT membership.workspace_id
    FROM cdt_workspace_memberships membership
    WHERE membership.user_id = xp.user_id
    ORDER BY COALESCE(membership.joined_at, membership.created_at, NOW()) ASC, membership.workspace_id
    LIMIT 1
  ),
  (
    SELECT workspace.id
    FROM cdt_workspaces workspace
    ORDER BY CASE WHEN workspace.slug = 'legacy' THEN 0 ELSE 1 END, workspace.created_at ASC
    LIMIT 1
  )
)
WHERE xp.workspace_id IS NULL;

WITH achievement_workspace AS (
  SELECT DISTINCT ON (ua.id)
    ua.id,
    xp.workspace_id
  FROM cdt_user_achievements ua
  JOIN cdt_user_xp_log xp
    ON xp.user_id = ua.user_id
   AND xp.related_type = 'achievement'
   AND xp.related_id = ua.achievement_id
   AND xp.reason = 'achievement_unlocked'
   AND xp.workspace_id IS NOT NULL
  ORDER BY ua.id, xp.created_at DESC
)
UPDATE cdt_user_achievements ua
SET workspace_id = achievement_workspace.workspace_id
FROM achievement_workspace
WHERE ua.id = achievement_workspace.id
  AND ua.workspace_id IS NULL;

UPDATE cdt_user_achievements ua
SET workspace_id = COALESCE(
  (
    SELECT membership.workspace_id
    FROM cdt_workspace_memberships membership
    WHERE membership.user_id = ua.user_id
    ORDER BY COALESCE(membership.joined_at, membership.created_at, NOW()) ASC, membership.workspace_id
    LIMIT 1
  ),
  (
    SELECT workspace.id
    FROM cdt_workspaces workspace
    ORDER BY CASE WHEN workspace.slug = 'legacy' THEN 0 ELSE 1 END, workspace.created_at ASC
    LIMIT 1
  )
)
WHERE ua.workspace_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_user_xp_log_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_user_xp_log
      ADD CONSTRAINT cdt_user_xp_log_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_user_achievements_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_user_achievements
      ADD CONSTRAINT cdt_user_achievements_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE cdt_user_xp_log
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE cdt_user_achievements
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE cdt_user_achievements
  DROP CONSTRAINT IF EXISTS cdt_user_achievements_user_id_achievement_id_key;

DROP INDEX IF EXISTS cdt_user_achievements_user_id_achievement_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cdt_user_achievements_workspace_scope
  ON cdt_user_achievements (workspace_id, user_id, achievement_id);

CREATE INDEX IF NOT EXISTS idx_cdt_user_achievements_workspace_user
  ON cdt_user_achievements (workspace_id, user_id);

DROP INDEX IF EXISTS ux_cdt_user_xp_log_event_once;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cdt_user_xp_log_event_once
  ON cdt_user_xp_log (workspace_id, user_id, reason, related_id, related_type)
  WHERE related_id IS NOT NULL
    AND related_type IS NOT NULL
    AND reason = ANY (ARRAY['todo_completed'::text, 'activity_completed'::text, 'achievement_unlocked'::text]);

CREATE INDEX IF NOT EXISTS idx_cdt_user_xp_log_workspace_user
  ON cdt_user_xp_log (workspace_id, user_id);

INSERT INTO cdt_module_definitions (
  key,
  category,
  display_name,
  description,
  supports_multiple,
  config_schema,
  is_active
)
SELECT
  'ranking',
  'central',
  'Ranking',
  'Resumo visual de ranking da gamificacao por workspace.',
  false,
  '{}'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM cdt_module_definitions
  WHERE key = 'ranking'
);

INSERT INTO cdt_module_dependencies (
  module_definition_id,
  dependency_definition_id
)
SELECT
  ranking.id,
  gamification.id
FROM cdt_module_definitions ranking
CROSS JOIN cdt_module_definitions gamification
WHERE ranking.key = 'ranking'
  AND gamification.key = 'gamification'
  AND NOT EXISTS (
    SELECT 1
    FROM cdt_module_dependencies dep
    WHERE dep.module_definition_id = ranking.id
      AND dep.dependency_definition_id = gamification.id
  );

INSERT INTO cdt_module_instances (
  workspace_id,
  module_definition_id,
  name,
  slug,
  title_override,
  is_enabled,
  config
)
SELECT
  workspace.id,
  gamification.id,
  'gamification',
  'gamification',
  NULL,
  true,
  '{}'::jsonb
FROM cdt_workspaces workspace
CROSS JOIN cdt_module_definitions gamification
WHERE gamification.key = 'gamification'
  AND workspace.is_active IS DISTINCT FROM false
  AND NOT EXISTS (
    SELECT 1
    FROM cdt_module_instances instance
    WHERE instance.workspace_id = workspace.id
      AND instance.module_definition_id = gamification.id
  );

INSERT INTO cdt_module_instances (
  workspace_id,
  module_definition_id,
  name,
  slug,
  title_override,
  is_enabled,
  config
)
SELECT
  workspace.id,
  ranking.id,
  'ranking',
  'ranking',
  NULL,
  true,
  '{}'::jsonb
FROM cdt_workspaces workspace
CROSS JOIN cdt_module_definitions ranking
JOIN cdt_module_definitions gamification
  ON gamification.key = 'gamification'
JOIN cdt_module_instances gamification_instance
  ON gamification_instance.workspace_id = workspace.id
 AND gamification_instance.module_definition_id = gamification.id
 AND gamification_instance.is_enabled = true
WHERE ranking.key = 'ranking'
  AND workspace.is_active IS DISTINCT FROM false
  AND NOT EXISTS (
    SELECT 1
    FROM cdt_module_instances instance
    WHERE instance.workspace_id = workspace.id
      AND instance.module_definition_id = ranking.id
  );
