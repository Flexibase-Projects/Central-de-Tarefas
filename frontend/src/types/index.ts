export type EisenhowerQuadrant = 1 | 2 | 3 | 4

export interface ProjectMapPosition {
  quadrant: EisenhowerQuadrant
  x: number // 0–100, percentual dentro do quadrante
  y: number // 0–100, percentual dentro do quadrante
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  github_url: string | null
  github_owner: string | null
  github_repo: string | null
  project_url: string | null
  /** Quadrante do mapa Eisenhower (1–4). Null = não posicionado (usa Q1 por padrão). */
  map_quadrant?: number | null
  /** Posição X no quadrante (0–100). */
  map_x?: number | null
  /** Posição Y no quadrante (0–100). */
  map_y?: number | null
  /** Ordem na tela Prioridades: menor = mais importante, null = fim. */
  priority_order?: number | null
  /** URL da imagem de capa (usado no kanban de atividades). */
  cover_image_url?: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  assigned_to: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Comment {
  id: string
  project_id: string | null
  task_id: string | null
  content: string
  created_at: string
  created_by: string | null
  author_name?: string | null
  author_email?: string | null
}

export interface ProjectTodo {
  id: string
  project_id: string
  title: string
  completed: boolean
  assigned_to: string | null
  sort_order: number
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
  }
  author: {
    login: string
    avatar_url: string
  } | null
  html_url: string
}

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  default_branch: string
  updated_at: string
  created_at: string
  size: number
  watchers_count: number
  license: string | null
  topics: string[]
  archived: boolean
  private: boolean
}

export interface Activity {
  id: string
  name: string
  description: string | null
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  assigned_to: string | null
  /** URL da imagem de capa (Supabase Storage). */
  cover_image_url?: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  display_name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  name: string
  display_name: string
  description: string | null
  category: string
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by: string | null
  created_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

export interface UserWithRole extends User {
  role?: Role
  permissions?: Permission[]
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  related_id: string | null
  related_type: string | null
  project_id: string | null
  read: boolean
  created_at: string
}

export interface UserIndicator {
  user_id: string
  name: string
  email: string
  avatar_url: string | null
  comments_count: number
  todos_created: number
  todos_completed: number
  activities_created: number
  activities_assigned: number
}

export interface ProjectIndicator {
  project_id: string
  project_name: string
  project_status: string
  todos_count: number
  todos_completed: number
  comments_count: number
}

export interface ActivityIndicator {
  activity_id: string
  activity_name: string
  status: string
  assigned_to: string | null
  due_date: string | null
}

export interface TeamTotals {
  total_users: number
  total_projects: number
  total_activities: number
  total_comments: number
  total_todos_created: number
  total_todos_completed: number
}

export interface IndicatorsData {
  by_user: UserIndicator[]
  by_project: ProjectIndicator[]
  by_activity: ActivityIndicator[]
  team: TeamTotals
}
