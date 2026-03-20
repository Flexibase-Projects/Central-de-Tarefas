-- Gestão: Organograma (cdt_user_org) + Custos por Departamento
-- Execute no SQL Editor do Supabase após as migrações anteriores.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Departamentos (centro de custo)
-- ============================================
CREATE TABLE IF NOT EXISTS cdt_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cdt_departments_name ON cdt_departments(name);

DROP TRIGGER IF EXISTS update_cdt_departments_updated_at ON cdt_departments;
CREATE TRIGGER update_cdt_departments_updated_at
  BEFORE UPDATE ON cdt_departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Itens de custo (fixos)
-- ============================================
CREATE TABLE IF NOT EXISTS cdt_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
  status VARCHAR(20) NOT NULL DEFAULT 'analise'
    CHECK (status IN ('analise', 'ativo', 'desativado', 'cancelado')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  category VARCHAR(40) NOT NULL DEFAULT 'outro'
    CHECK (category IN ('ferramenta', 'licenca', 'infraestrutura', 'servico', 'outro')),
  activities_description TEXT,
  result_savings_description TEXT,
  result_savings_amount NUMERIC(14, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cdt_cost_items_status ON cdt_cost_items(status);
CREATE INDEX IF NOT EXISTS idx_cdt_cost_items_is_active ON cdt_cost_items(is_active);

DROP TRIGGER IF EXISTS update_cdt_cost_items_updated_at ON cdt_cost_items;
CREATE TRIGGER update_cdt_cost_items_updated_at
  BEFORE UPDATE ON cdt_cost_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Vínculo departamento ↔ custo
-- ============================================
CREATE TABLE IF NOT EXISTS cdt_department_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES cdt_departments(id) ON DELETE CASCADE,
  cost_id UUID NOT NULL REFERENCES cdt_cost_items(id) ON DELETE CASCADE,
  link_status VARCHAR(20) DEFAULT 'ativo'
    CHECK (link_status IS NULL OR link_status IN ('ativo', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(department_id, cost_id)
);

CREATE INDEX IF NOT EXISTS idx_cdt_department_costs_dept ON cdt_department_costs(department_id);
CREATE INDEX IF NOT EXISTS idx_cdt_department_costs_cost ON cdt_department_costs(cost_id);

-- ============================================
-- Membros do departamento (custo individual)
-- ============================================
CREATE TABLE IF NOT EXISTS cdt_department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES cdt_departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES cdt_users(id) ON DELETE CASCADE,
  individual_monthly_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  role_label VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(department_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cdt_department_members_dept ON cdt_department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_cdt_department_members_user ON cdt_department_members(user_id);

DROP TRIGGER IF EXISTS update_cdt_department_members_updated_at ON cdt_department_members;
CREATE TRIGGER update_cdt_department_members_updated_at
  BEFORE UPDATE ON cdt_department_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Alocação custo → pessoa (opcional)
-- ============================================
CREATE TABLE IF NOT EXISTS cdt_person_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES cdt_departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES cdt_users(id) ON DELETE CASCADE,
  cost_id UUID NOT NULL REFERENCES cdt_cost_items(id) ON DELETE CASCADE,
  allocation_pct NUMERIC(5, 2) CHECK (allocation_pct IS NULL OR (allocation_pct >= 0 AND allocation_pct <= 100)),
  amount NUMERIC(14, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(department_id, user_id, cost_id)
);

CREATE INDEX IF NOT EXISTS idx_cdt_person_cost_alloc_cost ON cdt_person_cost_allocations(cost_id);

-- ============================================
-- Layout do mapa de custos (React Flow)
-- ============================================
CREATE TABLE IF NOT EXISTS cdt_cost_map_layout (
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('department', 'cost', 'person')),
  entity_id UUID NOT NULL,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_type, entity_id)
);

-- ============================================
-- Organograma: hierarquia por linha (reports_to_id → outra linha), nome livre
-- ============================================
CREATE TABLE IF NOT EXISTS cdt_user_org (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name VARCHAR(255) NOT NULL,
  reports_to_id UUID REFERENCES cdt_user_org(id) ON DELETE SET NULL,
  job_title VARCHAR(255),
  display_order INT NOT NULL DEFAULT 0,
  department_id UUID REFERENCES cdt_departments(id) ON DELETE SET NULL,
  monthly_salary NUMERIC(14, 2),
  monthly_cost NUMERIC(14, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cdt_user_org_no_self_report CHECK (reports_to_id IS NULL OR reports_to_id <> id)
);

CREATE INDEX IF NOT EXISTS idx_cdt_user_org_reports_to ON cdt_user_org(reports_to_id);
CREATE INDEX IF NOT EXISTS idx_cdt_user_org_dept ON cdt_user_org(department_id);

DROP TRIGGER IF EXISTS update_cdt_user_org_updated_at ON cdt_user_org;
CREATE TRIGGER update_cdt_user_org_updated_at
  BEFORE UPDATE ON cdt_user_org
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
