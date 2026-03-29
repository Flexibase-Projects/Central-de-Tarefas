CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cdt_workspace_groups (
  key VARCHAR(80) PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  description TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO cdt_workspace_groups (
  key,
  label,
  description,
  sort_order,
  is_public
)
SELECT
  'core',
  'Operacao',
  'Workspace base do rollout',
  0,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM cdt_workspace_groups
  WHERE key = 'core'
);

CREATE TABLE IF NOT EXISTS cdt_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  central_workspace_id UUID NULL,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  group_key VARCHAR(80) NOT NULL DEFAULT 'core',
  group_label VARCHAR(200) NOT NULL DEFAULT 'Operacao',
  group_description TEXT NULL,
  avatar_url TEXT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cdt_workspaces_slug
  ON cdt_workspaces (slug);

CREATE INDEX IF NOT EXISTS idx_cdt_workspaces_public_active
  ON cdt_workspaces (is_public, is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_workspaces_slug_not_empty'
  ) THEN
    ALTER TABLE cdt_workspaces
      ADD CONSTRAINT cdt_workspaces_slug_not_empty
      CHECK (length(trim(slug)) > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cdt_workspace_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES cdt_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES cdt_users(id) ON DELETE CASCADE,
  role_key VARCHAR(120) NOT NULL DEFAULT 'member',
  role_name VARCHAR(120) NULL,
  role_display_name VARCHAR(200) NULL,
  status TEXT NOT NULL DEFAULT 'active',
  membership_status TEXT NOT NULL DEFAULT 'active',
  is_default BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'local',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ NULL,
  approved_by UUID NULL REFERENCES cdt_users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_memberships_workspace_status
  ON cdt_workspace_memberships (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_memberships_user_status
  ON cdt_workspace_memberships (user_id, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_workspace_memberships_status_check'
  ) THEN
    ALTER TABLE cdt_workspace_memberships
      ADD CONSTRAINT cdt_workspace_memberships_status_check
      CHECK (status IN ('active', 'pending', 'revoked'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cdt_workspace_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES cdt_workspaces(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES cdt_users(id) ON DELETE SET NULL,
  email VARCHAR(320) NOT NULL,
  requested_email VARCHAR(320) NULL,
  name VARCHAR(200) NOT NULL,
  requested_name VARCHAR(200) NULL,
  message TEXT NULL,
  requested_by_user_id UUID NULL REFERENCES cdt_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  decision_reason TEXT NULL,
  review_note TEXT NULL,
  reviewed_by UUID NULL REFERENCES cdt_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_access_requests_workspace_status
  ON cdt_workspace_access_requests (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_access_requests_email
  ON cdt_workspace_access_requests (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_cdt_workspace_access_requests_pending_email
  ON cdt_workspace_access_requests (workspace_id, lower(email))
  WHERE status = 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_workspace_access_requests_status_check'
  ) THEN
    ALTER TABLE cdt_workspace_access_requests
      ADD CONSTRAINT cdt_workspace_access_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
  END IF;
END $$;

INSERT INTO cdt_workspaces (
  slug,
  name,
  description,
  group_key,
  group_label,
  group_description,
  is_public,
  is_active
)
SELECT
  'legacy',
  'Workspace Legacy',
  'Workspace bootstrap que preserva todos os dados historicos do CDT durante o rollout do SSO central.',
  'core',
  'Operacao',
  'Workspace base do rollout',
  true,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM cdt_workspaces
  WHERE slug = 'legacy'
);

INSERT INTO cdt_workspace_memberships (
  workspace_id,
  user_id,
  role_key,
  role_name,
  role_display_name,
  status,
  membership_status,
  is_default,
  source,
  joined_at,
  approved_at
)
SELECT
  workspaces.id,
  users.id,
  COALESCE(roles.name, 'member'),
  roles.name,
  COALESCE(roles.display_name, 'Membro'),
  'active',
  'active',
  true,
  'bootstrap',
  NOW(),
  NOW()
FROM cdt_workspaces workspaces
CROSS JOIN cdt_users users
LEFT JOIN cdt_user_roles user_roles
  ON user_roles.user_id = users.id
LEFT JOIN cdt_roles roles
  ON roles.id = user_roles.role_id
WHERE workspaces.slug = 'legacy'
  AND users.is_active IS DISTINCT FROM false
ON CONFLICT (workspace_id, user_id) DO NOTHING;

UPDATE cdt_workspace_memberships
SET
  membership_status = COALESCE(NULLIF(membership_status, ''), status, 'active'),
  role_key = COALESCE(NULLIF(role_key, ''), role_name, 'member'),
  role_display_name = COALESCE(role_display_name, CASE
    WHEN COALESCE(NULLIF(role_key, ''), role_name, 'member') = 'admin' THEN 'Administrador'
    WHEN COALESCE(NULLIF(role_key, ''), role_name, 'member') = 'owner' THEN 'Proprietario'
    WHEN COALESCE(NULLIF(role_key, ''), role_name, 'member') = 'editor' THEN 'Editor'
    WHEN COALESCE(NULLIF(role_key, ''), role_name, 'member') = 'viewer' THEN 'Visualizador'
    ELSE 'Membro'
  END),
  joined_at = COALESCE(joined_at, created_at, NOW())
WHERE membership_status IS NULL
   OR membership_status = ''
   OR role_key IS NULL
   OR role_key = ''
   OR role_display_name IS NULL
   OR joined_at IS NULL;

UPDATE cdt_workspace_memberships
SET is_default = true
WHERE is_default = false
  AND workspace_id IN (
    SELECT id
    FROM cdt_workspaces
    WHERE slug = 'legacy'
  );

UPDATE cdt_workspace_access_requests
SET
  requested_email = COALESCE(requested_email, email),
  requested_name = COALESCE(requested_name, name)
WHERE requested_email IS NULL
   OR requested_name IS NULL;

ALTER TABLE IF EXISTS cdt_projects
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE IF EXISTS cdt_activities
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE IF EXISTS cdt_project_todos
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE IF EXISTS cdt_comments
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE IF EXISTS cdt_notifications
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

WITH legacy_workspace AS (
  SELECT id
  FROM cdt_workspaces
  WHERE slug = 'legacy'
  LIMIT 1
)
UPDATE cdt_projects
SET workspace_id = legacy_workspace.id
FROM legacy_workspace
WHERE cdt_projects.workspace_id IS NULL;

WITH legacy_workspace AS (
  SELECT id
  FROM cdt_workspaces
  WHERE slug = 'legacy'
  LIMIT 1
)
UPDATE cdt_activities
SET workspace_id = legacy_workspace.id
FROM legacy_workspace
WHERE cdt_activities.workspace_id IS NULL;

WITH legacy_workspace AS (
  SELECT id
  FROM cdt_workspaces
  WHERE slug = 'legacy'
  LIMIT 1
)
UPDATE cdt_project_todos
SET workspace_id = legacy_workspace.id
FROM legacy_workspace
WHERE cdt_project_todos.workspace_id IS NULL;

WITH legacy_workspace AS (
  SELECT id
  FROM cdt_workspaces
  WHERE slug = 'legacy'
  LIMIT 1
)
UPDATE cdt_comments
SET workspace_id = legacy_workspace.id
FROM legacy_workspace
WHERE cdt_comments.workspace_id IS NULL;

WITH legacy_workspace AS (
  SELECT id
  FROM cdt_workspaces
  WHERE slug = 'legacy'
  LIMIT 1
)
UPDATE cdt_notifications
SET workspace_id = legacy_workspace.id
FROM legacy_workspace
WHERE cdt_notifications.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_cdt_projects_workspace_id
  ON cdt_projects (workspace_id);

CREATE INDEX IF NOT EXISTS idx_cdt_activities_workspace_id
  ON cdt_activities (workspace_id);

CREATE INDEX IF NOT EXISTS idx_cdt_project_todos_workspace_id
  ON cdt_project_todos (workspace_id);

CREATE INDEX IF NOT EXISTS idx_cdt_comments_workspace_id
  ON cdt_comments (workspace_id);

CREATE INDEX IF NOT EXISTS idx_cdt_notifications_workspace_id
  ON cdt_notifications (workspace_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cdt_projects'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_projects_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_projects
      ADD CONSTRAINT cdt_projects_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE RESTRICT;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cdt_activities'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_activities_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_activities
      ADD CONSTRAINT cdt_activities_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE RESTRICT;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cdt_project_todos'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_project_todos_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_project_todos
      ADD CONSTRAINT cdt_project_todos_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE RESTRICT;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cdt_comments'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_comments_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_comments
      ADD CONSTRAINT cdt_comments_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE RESTRICT;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cdt_notifications'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_notifications_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_notifications
      ADD CONSTRAINT cdt_notifications_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE RESTRICT;
  END IF;
END $$;
