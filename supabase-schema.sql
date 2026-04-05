-- Schema do Banco de Dados - CDT Inteligência
-- Execute este script no SQL Editor do Supabase Dashboard

-- ============================================
-- 1. Função para atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 2. Tabela: projects
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'backlog',
  github_url TEXT,
  github_owner VARCHAR(255),
  github_repo VARCHAR(255),
  project_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para projects
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_github_owner_repo ON projects(github_owner, github_repo);

-- Trigger para atualizar updated_at em projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Tabela: tasks
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'todo',
  priority VARCHAR(10) NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Trigger para atualizar updated_at em tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Tabela: comments
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT comments_project_or_task CHECK (
    (project_id IS NOT NULL AND task_id IS NULL) OR
    (project_id IS NULL AND task_id IS NOT NULL)
  )
);

-- Índices para comments
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ============================================
-- 5. Tabela: project_assignments
-- ============================================
CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'developer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Índices para project_assignments
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);

-- ============================================
-- 6. Tabela: activities
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'backlog',
  due_date TIMESTAMP WITH TIME ZONE,
  priority VARCHAR(10) NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para activities
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to ON activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_priority ON activities(priority);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON activities(due_date);

-- Trigger para atualizar updated_at em activities
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Tabela: github_repositories (Opcional - para cache)
-- ============================================
CREATE TABLE IF NOT EXISTS github_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  full_name VARCHAR(500) NOT NULL,
  description TEXT,
  language VARCHAR(100),
  stargazers_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  open_issues_count INTEGER DEFAULT 0,
  default_branch VARCHAR(100),
  html_url TEXT NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner, repo)
);

-- Índices para github_repositories
CREATE INDEX IF NOT EXISTS idx_github_repos_owner_repo ON github_repositories(owner, repo);
CREATE INDEX IF NOT EXISTS idx_github_repos_cached_at ON github_repositories(cached_at DESC);

-- ============================================
-- 7. Configuração RLS (Row Level Security)
-- ============================================
-- Desabilitar RLS temporariamente para desenvolvimento
-- Quando autenticação estiver implementada, você pode habilitar e criar políticas

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE github_repositories DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Migração: coluna project_url (link do projeto para status online/offline)
-- ============================================
-- Se a tabela de projetos se chama cdt_projects, execute:
-- ALTER TABLE cdt_projects ADD COLUMN IF NOT EXISTS project_url TEXT;
-- Se a tabela se chama projects (sem prefixo), project_url já está no CREATE TABLE acima.

-- ============================================
-- Migração: posição no mapa Eisenhower (global para todos os usuários)
-- ============================================
-- Para cdt_projects (nome usado na aplicação):
ALTER TABLE cdt_projects ADD COLUMN IF NOT EXISTS map_quadrant SMALLINT NULL;
ALTER TABLE cdt_projects ADD COLUMN IF NOT EXISTS map_x NUMERIC(5,2) NULL;
ALTER TABLE cdt_projects ADD COLUMN IF NOT EXISTS map_y NUMERIC(5,2) NULL;

-- Ordem de prioridade (tela Prioridades): menor = mais importante, NULL = fim da lista
ALTER TABLE cdt_projects ADD COLUMN IF NOT EXISTS priority_order INTEGER NULL;
CREATE INDEX IF NOT EXISTS idx_cdt_projects_priority_order ON cdt_projects(priority_order ASC NULLS LAST);
-- Para tabela projects (se existir sem prefixo):
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS map_quadrant SMALLINT NULL;
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS map_x NUMERIC(5,2) NULL;
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS map_y NUMERIC(5,2) NULL;

-- ============================================
-- Migração: imagem de capa em atividades (Supabase Storage)
-- ============================================
-- Tabela cdt_activities (nome usada na aplicação):
ALTER TABLE cdt_activities ADD COLUMN IF NOT EXISTS cover_image_url TEXT NULL;
-- Se a tabela se chama activities (sem prefixo):
-- ALTER TABLE activities ADD COLUMN IF NOT EXISTS cover_image_url TEXT NULL;

-- Criar bucket no Supabase Dashboard: Storage > New bucket > "activity-covers" (public)
-- Ou via SQL (Storage é gerenciado pelo Dashboard). Política: permitir leitura pública e upload autenticado.

-- Bucket "workspace-profile-avatars" (público): avatares de perfil por workspace em cdt_workspace_user_profiles.avatar_url.
-- Upload apenas via backend (service role); o servidor cria o bucket na inicialização se ainda não existir.

-- ============================================
-- Migração: Canva em Equipe (Excalidraw)
-- ============================================
CREATE TABLE IF NOT EXISTS cdt_team_canvas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL DEFAULT 'default',
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cdt_team_canvas_name ON cdt_team_canvas(name);
CREATE INDEX IF NOT EXISTS idx_cdt_team_canvas_updated_at ON cdt_team_canvas(updated_at DESC);
-- Trigger updated_at
DROP TRIGGER IF EXISTS update_cdt_team_canvas_updated_at ON cdt_team_canvas;
CREATE TRIGGER update_cdt_team_canvas_updated_at BEFORE UPDATE ON cdt_team_canvas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Permissão para o canva (inserir na tabela de permissões e associar aos papéis desejados)
-- INSERT INTO cdt_permissions (id, name, display_name, description, category) VALUES (gen_random_uuid(), 'access_canva_equipe', 'Acessar Canva em Equipe', 'Permite acessar o quadro colaborativo Canva em Equipe', 'ferramentas') ON CONFLICT DO NOTHING;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Após executar este script, as tabelas estarão criadas e prontas para uso.
-- Você pode verificar as tabelas no Supabase Dashboard > Table Editor
