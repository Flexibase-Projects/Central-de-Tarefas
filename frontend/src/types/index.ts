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
  responsible_user_id?: string | null
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
  activity_id?: string | null
  content: string
  created_at: string
  created_by: string | null
  author_name?: string | null
  author_email?: string | null
  author_level?: number | null
}

export interface ProjectTodo {
  id: string
  project_id: string | null
  activity_id?: string | null
  title: string
  completed: boolean
  assigned_to: string | null
  sort_order: number
  created_at: string
  updated_at: string
  created_by: string | null
  xp_reward?: number        // default 1.00
  deadline_bonus_percent?: number // default 0.00
  deadline?: string | null  // ISO date
  achievement_id?: string | null
  completed_at?: string | null
  assigned_at?: string | null
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
  xp_reward?: number        // default 1.00
  deadline_bonus_percent?: number // default 0.00
  achievement_id?: string | null
  completed_at?: string | null
}

export interface User {
  id: string
  central_user_id?: string | null
  identity_status?: 'legacy_only' | 'linked' | 'manual_review' | 'conflict' | 'disabled'
  last_identity_sync_at?: string | null
  email: string
  name: string
  avatar_url: string | null
  is_active: boolean
  /** Quando true, fluxo de login oferece definir senha forte (convite com senha temporaria). */
  must_set_password?: boolean
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

export interface TodoMutationResponse {
  todo: ProjectTodo
  xpDelta?: number | null
  xpAction?: 'awarded' | 'reversed' | 'retroactive' | 'none' | string | null
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

export interface IndicatorsPersonalSummary {
  commentsCount: number
  todosAssignedTotal: number
  todosAssignedCompleted: number
  todosAssignedOpen: number
  activitiesAssigned: number
}

export interface RecentAssignedTodo {
  id: string
  title: string
  completed: boolean
  assignedAt: string | null
  deadline: string | null
  projectName: string | null
  activityName: string | null
  xpReward: number
  projectId?: string | null
  activityId?: string | null
}

export interface ProjectTodoCardSummary {
  project_id: string
  project_name: string
  project_status: string
  myAssignedOpenCount: number
  xpPendingCount: number
}

export interface IndicatorsData {
  scope: 'team' | 'me'
  personal: IndicatorsPersonalSummary
  recentAssignedTodos: RecentAssignedTodo[]
  by_user: UserIndicator[]
  by_project: ProjectIndicator[]
  by_activity: ActivityIndicator[]
  team: TeamTotals
}

export interface UserProgressAchievement {
  id: string
  slug?: string
  name: string
  description: string
  icon: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  xpBonus?: number
  unlocked: boolean
  unlockedAt?: string | null
}

export interface UserProgress {
  completedTodos: number
  completedActivities: number
  totalXp: number
  level: number
  xpInCurrentLevel: number
  xpForNextLevel: number
  streakDays?: number
  tier?: {
    name: string
    color: string
    glowColor: string
    cssClass: string
  }
  achievements: UserProgressAchievement[]
}

export interface WorkspaceQuickEntry {
  key: 'pilot' | 'admin'
  title: string
  description: string
  href: string
  cta: string
  disabled?: boolean
  badge?: string | null
}

export interface WorkspaceModuleState {
  id?: string | null
  key: string
  display_name: string
  description?: string | null
  category?: string | null
  definition_id?: string | null
  instance_id?: string | null
  slug?: string | null
  title_override?: string | null
  is_enabled: boolean
  available: boolean
  dependency_keys?: string[]
  reason?: string | null
}

export interface WorkspaceModuleCapability {
  module_key: string
  can_access: boolean
  is_visible: boolean
  is_managerial_only: boolean
  reason?: string | null
}

export interface WorkspaceCapabilitySet {
  is_global_admin: boolean
  is_workspace_manager: boolean
  can_manage_workspace: boolean
  accessible_module_keys: string[]
  visible_module_keys: string[]
  module_capabilities: Record<string, WorkspaceModuleCapability>
}

export interface WorkspaceMembershipContext {
  role_id: string | null
  role_key: string | null
  role_display_name: string | null
  membership_status?: string | null
  is_managerial: boolean
}

export interface WorkspaceContextSummary {
  id: string
  slug: string
  name: string
  description?: string | null
}

export interface WorkspaceContextData {
  workspace: WorkspaceContextSummary
  membership: WorkspaceMembershipContext
  modules: WorkspaceModuleState[]
  capabilities: WorkspaceCapabilitySet
}

export interface WorkspaceMemberRole {
  id: string
  name: string
  display_name: string
}

export interface WorkspaceManagedMember {
  id: string
  name: string
  email: string | null
  avatar_url: string | null
  central_user_id: string | null
  role: WorkspaceMemberRole | null
  role_key: string | null
  role_display_name: string | null
  membership_status: string
  is_active: boolean
  is_default: boolean
  joined_at: string
}

export interface WorkspaceProfileData {
  display_name: string
  avatar_url: string | null
  fallback_name: string
  fallback_avatar_url: string | null
  is_overridden: boolean
}

export interface WorkspaceTeamGamificationMember {
  user_id: string
  name: string
  avatar_url: string | null
  level: number
  total_xp: number
  unlocked_achievements: number
}

export interface WorkspaceTeamGamificationSummaryData {
  total_members: number
  active_with_xp: number
  average_level: number
  average_xp: number
  total_unlocked_achievements: number
  top_members: WorkspaceTeamGamificationMember[]
}

export interface WorkspaceTeamGamificationSummaryState {
  enabled: boolean
  reason?: string | null
  summary: WorkspaceTeamGamificationSummaryData | null
}

export interface WorkspaceProfileResponse {
  workspace: WorkspaceContextSummary
  membership: WorkspaceMembershipContext
  profile: WorkspaceProfileData
  modules?: WorkspaceModuleState[]
  workspace_role_flags?: {
    is_managerial: boolean
    is_global_admin?: boolean
    can_manage_workspace?: boolean
  }
  capabilities?: WorkspaceCapabilitySet
  team_gamification_summary?: WorkspaceTeamGamificationSummaryState | null
}

export type ExecutionViewMode = 'list' | 'kanban'

export interface HomeTodoItem {
  id: string
  title: string
  deadline: string | null
  projectId: string | null
  projectName: string | null
  activityId: string | null
  activityName: string | null
  assigneeName?: string | null
  sourceType?: 'todo' | 'activity'
}

export interface HomeReviewItem {
  id: string
  kind: 'project' | 'activity' | 'todo'
  title: string
  status: string
  dueDate: string | null
  ownerName?: string | null
  waitingReason?: 'review' | 'xp'
}

export interface HomeSummary {
  myOpen: number
  myPending?: number
  overdue: number
  waiting: number
  teamOpenActivities?: number
  teamOpenItems?: number
  xpPending?: number
}

export interface HomeViewData {
  persona: 'admin' | 'member'
  summary: HomeSummary
  buckets: {
    now: HomeTodoItem[]
    pending?: HomeTodoItem[]
    overdue: HomeTodoItem[]
    waiting: HomeReviewItem[]
    teamOpenActivities: HomeTodoItem[]
    teamOpenItems?: HomeTodoItem[]
  }
  quickTargets: {
    projectsOpen: string
    activitiesOpen: string
    indicatorsUrl: string
    adminUrl?: string
  }
}

export interface ExecutionCardSummaryRow {
  entity_type: 'project' | 'activity'
  project_id: string
  project_name: string
  project_status: string
  myAssignedOpenCount: number
  totalOpenCount: number
  xpPendingCount: number
}

export interface Achievement {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  xpBonus: number
  rewardXpFixed?: number
  rewardPercent?: number
  conditionType?: string | null
  conditionValue?: number | null
  mode?: 'global_auto' | 'linked_item' | 'manual' | string
  isPreset?: boolean
  isActive?: boolean
  unlocked?: boolean
  unlockedAt?: string | null
  createdAt?: string
}

export type TierName = 'Cobalt' | 'Uranium' | 'Platinum' | 'FlexiBase'

export interface TierInfo {
  name: TierName
  min: number
  max: number
  color: string
  glowColor: string
  cssClass: string
  gradient?: string
}
