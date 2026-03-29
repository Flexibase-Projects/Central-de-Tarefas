-- Projecao local de workspaces, memberships e solicitacoes de acesso.
-- Estrutura pensada para coexistir com o modelo central_user_id -> cdt_users.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS cdt_workspace_groups (
  key TEXT PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cdt_workspace_groups_key_check CHECK (key ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$')
);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_groups_sort_order
  ON cdt_workspace_groups(sort_order, label);

DROP TRIGGER IF EXISTS update_cdt_workspace_groups_updated_at ON cdt_workspace_groups;
CREATE TRIGGER update_cdt_workspace_groups_updated_at
  BEFORE UPDATE ON cdt_workspace_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS cdt_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_key TEXT NOT NULL REFERENCES cdt_workspace_groups(key) ON DELETE RESTRICT,
  avatar_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cdt_workspaces_slug_check CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$')
);

CREATE INDEX IF NOT EXISTS idx_cdt_workspaces_group_key
  ON cdt_workspaces(group_key);

CREATE INDEX IF NOT EXISTS idx_cdt_workspaces_sort_order
  ON cdt_workspaces(group_key, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_cdt_workspaces_is_active
  ON cdt_workspaces(is_active);

DROP TRIGGER IF EXISTS update_cdt_workspaces_updated_at ON cdt_workspaces;
CREATE TRIGGER update_cdt_workspaces_updated_at
  BEFORE UPDATE ON cdt_workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS cdt_workspace_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES cdt_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES cdt_users(id) ON DELETE CASCADE,
  role_key VARCHAR(40) NOT NULL DEFAULT 'member',
  membership_status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (membership_status IN ('active', 'pending', 'blocked', 'revoked')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_memberships_workspace
  ON cdt_workspace_memberships(workspace_id, membership_status);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_memberships_user
  ON cdt_workspace_memberships(user_id, membership_status);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_memberships_default
  ON cdt_workspace_memberships(user_id, is_default DESC, joined_at ASC);

DROP TRIGGER IF EXISTS update_cdt_workspace_memberships_updated_at ON cdt_workspace_memberships;
CREATE TRIGGER update_cdt_workspace_memberships_updated_at
  BEFORE UPDATE ON cdt_workspace_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS cdt_workspace_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES cdt_workspaces(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES cdt_users(id) ON DELETE SET NULL,
  requested_email VARCHAR(320) NOT NULL,
  requested_name VARCHAR(255) NOT NULL,
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'blocked', 'rejected', 'cancelled')),
  decision_reason TEXT,
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL REFERENCES cdt_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_access_requests_workspace
  ON cdt_workspace_access_requests(workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_access_requests_user
  ON cdt_workspace_access_requests(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cdt_workspace_access_requests_email
  ON cdt_workspace_access_requests(requested_email, status, created_at DESC);

DROP TRIGGER IF EXISTS update_cdt_workspace_access_requests_updated_at ON cdt_workspace_access_requests;
CREATE TRIGGER update_cdt_workspace_access_requests_updated_at
  BEFORE UPDATE ON cdt_workspace_access_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
