-- Escopo por workspace para organograma, custos e canva em equipe.
-- Backfill: ancora os dados globais existentes no workspace com mais memberships ativas.

ALTER TABLE cdt_departments
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE cdt_cost_items
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE cdt_department_costs
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE cdt_department_members
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE cdt_person_cost_allocations
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE cdt_cost_map_layout
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE cdt_user_org
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

ALTER TABLE cdt_team_canvas
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;

WITH seed_workspace AS (
  SELECT workspace.id
  FROM cdt_workspaces workspace
  LEFT JOIN cdt_workspace_memberships membership
    ON membership.workspace_id = workspace.id
   AND COALESCE(membership.is_active, true) = true
   AND membership.left_at IS NULL
  GROUP BY workspace.id, workspace.slug, workspace.created_at, workspace.name
  ORDER BY COUNT(membership.id) DESC,
           CASE WHEN workspace.slug = 'legacy' THEN 0 ELSE 1 END,
           workspace.created_at ASC NULLS LAST,
           workspace.name ASC
  LIMIT 1
)
UPDATE cdt_departments department
SET workspace_id = seed_workspace.id
FROM seed_workspace
WHERE department.workspace_id IS NULL;

WITH seed_workspace AS (
  SELECT workspace.id
  FROM cdt_workspaces workspace
  LEFT JOIN cdt_workspace_memberships membership
    ON membership.workspace_id = workspace.id
   AND COALESCE(membership.is_active, true) = true
   AND membership.left_at IS NULL
  GROUP BY workspace.id, workspace.slug, workspace.created_at, workspace.name
  ORDER BY COUNT(membership.id) DESC,
           CASE WHEN workspace.slug = 'legacy' THEN 0 ELSE 1 END,
           workspace.created_at ASC NULLS LAST,
           workspace.name ASC
  LIMIT 1
)
UPDATE cdt_cost_items cost_item
SET workspace_id = seed_workspace.id
FROM seed_workspace
WHERE cost_item.workspace_id IS NULL;

WITH seed_workspace AS (
  SELECT workspace.id
  FROM cdt_workspaces workspace
  LEFT JOIN cdt_workspace_memberships membership
    ON membership.workspace_id = workspace.id
   AND COALESCE(membership.is_active, true) = true
   AND membership.left_at IS NULL
  GROUP BY workspace.id, workspace.slug, workspace.created_at, workspace.name
  ORDER BY COUNT(membership.id) DESC,
           CASE WHEN workspace.slug = 'legacy' THEN 0 ELSE 1 END,
           workspace.created_at ASC NULLS LAST,
           workspace.name ASC
  LIMIT 1
)
UPDATE cdt_user_org org_entry
SET workspace_id = COALESCE(
  (
    SELECT department.workspace_id
    FROM cdt_departments department
    WHERE department.id = org_entry.department_id
    LIMIT 1
  ),
  seed_workspace.id
)
FROM seed_workspace
WHERE org_entry.workspace_id IS NULL;

WITH seed_workspace AS (
  SELECT workspace.id
  FROM cdt_workspaces workspace
  LEFT JOIN cdt_workspace_memberships membership
    ON membership.workspace_id = workspace.id
   AND COALESCE(membership.is_active, true) = true
   AND membership.left_at IS NULL
  GROUP BY workspace.id, workspace.slug, workspace.created_at, workspace.name
  ORDER BY COUNT(membership.id) DESC,
           CASE WHEN workspace.slug = 'legacy' THEN 0 ELSE 1 END,
           workspace.created_at ASC NULLS LAST,
           workspace.name ASC
  LIMIT 1
)
UPDATE cdt_team_canvas canvas
SET workspace_id = seed_workspace.id
FROM seed_workspace
WHERE canvas.workspace_id IS NULL;

UPDATE cdt_department_costs department_cost
SET workspace_id = COALESCE(
  (
    SELECT department.workspace_id
    FROM cdt_departments department
    WHERE department.id = department_cost.department_id
    LIMIT 1
  ),
  (
    SELECT cost_item.workspace_id
    FROM cdt_cost_items cost_item
    WHERE cost_item.id = department_cost.cost_id
    LIMIT 1
  )
)
WHERE department_cost.workspace_id IS NULL;

UPDATE cdt_department_members department_member
SET workspace_id = department.workspace_id
FROM cdt_departments department
WHERE department_member.department_id = department.id
  AND department_member.workspace_id IS NULL;

UPDATE cdt_person_cost_allocations allocation
SET workspace_id = COALESCE(
  (
    SELECT department.workspace_id
    FROM cdt_departments department
    WHERE department.id = allocation.department_id
    LIMIT 1
  ),
  (
    SELECT cost_item.workspace_id
    FROM cdt_cost_items cost_item
    WHERE cost_item.id = allocation.cost_id
    LIMIT 1
  )
)
WHERE allocation.workspace_id IS NULL;

WITH seed_workspace AS (
  SELECT workspace.id
  FROM cdt_workspaces workspace
  LEFT JOIN cdt_workspace_memberships membership
    ON membership.workspace_id = workspace.id
   AND COALESCE(membership.is_active, true) = true
   AND membership.left_at IS NULL
  GROUP BY workspace.id, workspace.slug, workspace.created_at, workspace.name
  ORDER BY COUNT(membership.id) DESC,
           CASE WHEN workspace.slug = 'legacy' THEN 0 ELSE 1 END,
           workspace.created_at ASC NULLS LAST,
           workspace.name ASC
  LIMIT 1
)
UPDATE cdt_cost_map_layout layout
SET workspace_id = COALESCE(
  (
    SELECT department.workspace_id
    FROM cdt_departments department
    WHERE layout.entity_type = 'department'
      AND department.id = layout.entity_id
    LIMIT 1
  ),
  (
    SELECT cost_item.workspace_id
    FROM cdt_cost_items cost_item
    WHERE layout.entity_type = 'cost'
      AND cost_item.id = layout.entity_id
    LIMIT 1
  ),
  (
    SELECT org_entry.workspace_id
    FROM cdt_user_org org_entry
    WHERE layout.entity_type = 'person'
      AND org_entry.id = layout.entity_id
    LIMIT 1
  ),
  seed_workspace.id
)
FROM seed_workspace
WHERE layout.workspace_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_departments_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_departments
      ADD CONSTRAINT cdt_departments_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_cost_items_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_cost_items
      ADD CONSTRAINT cdt_cost_items_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_department_costs_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_department_costs
      ADD CONSTRAINT cdt_department_costs_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_department_members_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_department_members
      ADD CONSTRAINT cdt_department_members_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_person_cost_allocations_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_person_cost_allocations
      ADD CONSTRAINT cdt_person_cost_allocations_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_cost_map_layout_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_cost_map_layout
      ADD CONSTRAINT cdt_cost_map_layout_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_user_org_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_user_org
      ADD CONSTRAINT cdt_user_org_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cdt_team_canvas_workspace_id_fkey'
  ) THEN
    ALTER TABLE cdt_team_canvas
      ADD CONSTRAINT cdt_team_canvas_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES cdt_workspaces(id)
      ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE cdt_departments
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE cdt_cost_items
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE cdt_department_costs
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE cdt_department_members
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE cdt_person_cost_allocations
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE cdt_cost_map_layout
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE cdt_user_org
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE cdt_team_canvas
  ALTER COLUMN workspace_id SET NOT NULL;

DROP INDEX IF EXISTS idx_cdt_team_canvas_name;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cdt_team_canvas_workspace_name
  ON cdt_team_canvas (workspace_id, name);

ALTER TABLE cdt_cost_map_layout
  DROP CONSTRAINT IF EXISTS cdt_cost_map_layout_pkey;

ALTER TABLE cdt_cost_map_layout
  ADD CONSTRAINT cdt_cost_map_layout_pkey
  PRIMARY KEY (workspace_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_cdt_departments_workspace_id
  ON cdt_departments (workspace_id, name);

CREATE INDEX IF NOT EXISTS idx_cdt_cost_items_workspace_id
  ON cdt_cost_items (workspace_id, name);

CREATE INDEX IF NOT EXISTS idx_cdt_department_costs_workspace_id
  ON cdt_department_costs (workspace_id, department_id);

CREATE INDEX IF NOT EXISTS idx_cdt_department_members_workspace_id
  ON cdt_department_members (workspace_id, department_id);

CREATE INDEX IF NOT EXISTS idx_cdt_person_cost_allocations_workspace_id
  ON cdt_person_cost_allocations (workspace_id, department_id);

CREATE INDEX IF NOT EXISTS idx_cdt_user_org_workspace_id
  ON cdt_user_org (workspace_id, reports_to_id, display_order);

CREATE INDEX IF NOT EXISTS idx_cdt_team_canvas_workspace_id
  ON cdt_team_canvas (workspace_id, updated_at DESC);
