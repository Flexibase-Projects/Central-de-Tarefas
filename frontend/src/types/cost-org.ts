/** Organograma — resposta GET /api/org/tree */
export type OrgTreeNode = {
  orgEntryId: string
  personName: string
  jobTitle: string | null
  displayOrder: number
  departmentId: string | null
  monthlySalary: number | null
  monthlyCost: number | null
  children: OrgTreeNode[]
}

export type OrgTeamMemberRow = {
  orgEntryId: string
  personName: string
  jobTitle: string | null
  displayOrder: number
  departmentId: string | null
  departmentName: string | null
  monthlySalary: number | null
  monthlyCost: number | null
  isSelectedRoot: boolean
}

export type OrgPersonSummary = {
  headcount: number
  totalMonthlySalary: number
  totalMonthlyCost: number
  team: OrgTeamMemberRow[]
}

export type Department = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type CostItem = {
  id: string
  name: string
  description: string | null
  amount: number
  currency: string
  status: string
  is_active: boolean
  category: string
  activities_description: string | null
  result_savings_description: string | null
  result_savings_amount: number | null
  created_at: string
  updated_at: string
}

export type DepartmentCostLink = {
  id: string
  department_id: string
  cost_id: string
  link_status: string | null
  created_at: string
}

export type DepartmentMemberRow = {
  id: string
  department_id: string
  user_id: string
  individual_monthly_cost: number
  role_label: string | null
  created_at: string
  updated_at: string
  user: { id: string; name: string; email: string; avatar_url: string | null } | null
}

export type CostManagementGraph = {
  departments: Department[]
  departmentCosts: DepartmentCostLink[]
  members: DepartmentMemberRow[]
  costItems: CostItem[]
}

/** Foco no mapa de custos (destaque + drawer lateral) */
export type CostCanvasFocus =
  | { kind: 'department'; departmentId: string }
  | { kind: 'cost'; costId: string }
  | { kind: 'member'; departmentId: string; userId: string }
