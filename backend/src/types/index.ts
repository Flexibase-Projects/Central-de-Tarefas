export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  github_url: string | null;
  github_owner: string | null;
  github_repo: string | null;
  project_url: string | null;
  /** Quadrante do mapa Eisenhower (1–4). Null = não posicionado. */
  map_quadrant?: number | null;
  /** Posição X no quadrante (0–100). */
  map_x?: number | null;
  /** Posição Y no quadrante (0–100). */
  map_y?: number | null;
  /** Ordem na tela Prioridades: menor = mais importante, null = fim. */
  priority_order?: number | null;
  responsible_user_id?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Comment {
  id: string;
  project_id: string | null;
  task_id: string | null;
  activity_id?: string | null;
  content: string;
  created_at: string;
  created_by: string | null;
  author_name?: string | null;
  author_email?: string | null;
}

export interface ProjectTodo {
  id: string;
  project_id: string | null;
  activity_id?: string | null;
  title: string;
  completed: boolean;
  assigned_to: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  xp_reward?: number | null;
  deadline_bonus_percent?: number | null;
  deadline?: string | null;
  achievement_id?: string | null;
  completed_at?: string | null;
  assigned_at?: string | null;
}

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  cover_image_url?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'developer' | 'reviewer';
  created_at: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  updated_at: string;
}

export interface User {
  id: string;
  central_user_id?: string | null;
  identity_status?: 'legacy_only' | 'linked' | 'manual_review' | 'conflict' | 'disabled';
  last_identity_sync_at?: string | null;
  email: string;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserWithRole extends User {
  role?: Role;
  permissions?: Permission[];
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  related_id: string | null;
  related_type: string | null;
  project_id: string | null;
  read: boolean;
  created_at: string;
}

/** Centro de custo */
export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type CostItemStatus = 'analise' | 'ativo' | 'desativado' | 'cancelado';
export type CostItemCategory = 'ferramenta' | 'licenca' | 'infraestrutura' | 'servico' | 'outro';

export interface CostItem {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  status: CostItemStatus;
  is_active: boolean;
  category: CostItemCategory;
  activities_description: string | null;
  result_savings_description: string | null;
  result_savings_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentCost {
  id: string;
  department_id: string;
  cost_id: string;
  link_status: string | null;
  created_at: string;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  user_id: string;
  individual_monthly_cost: number;
  role_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostMapLayoutRow {
  entity_type: 'department' | 'cost' | 'person';
  entity_id: string;
  position_x: number;
  position_y: number;
  updated_at: string;
}

/** Organograma: uma linha (nome livre); reports_to_id aponta para id de outra linha */
export interface UserOrgEntry {
  id: string;
  person_name: string;
  reports_to_id: string | null;
  job_title: string | null;
  display_order: number;
  department_id: string | null;
  monthly_salary: number | null;
  monthly_cost: number | null;
  created_at: string;
  updated_at: string;
}
