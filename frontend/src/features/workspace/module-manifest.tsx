import type { ElementType } from 'react'
import {
  BarChart2,
  CheckSquare,
  Code,
  Dashboard,
  DollarSign,
  Flag,
  MapIcon,
  OrgChartIcon,
  Settings,
  Trophy,
} from '@/components/ui/icons'

export type WorkspaceSidebarSectionKey =
  | 'central'
  | 'execution'
  | 'insights'
  | 'administration'

export interface WorkspaceSidebarSectionDefinition {
  key: WorkspaceSidebarSectionKey
  title: string
  hint: string
  order: number
}

export interface WorkspaceModuleManifestEntry {
  key: string
  title: string
  navTitle?: string
  description: string
  entryPath: string
  icon: ElementType
  section: WorkspaceSidebarSectionKey
  order: number
  visibleInSidebar?: boolean
  managerialOnly?: boolean
  maintenance?: boolean
}

export interface WorkspaceSidebarItem {
  key: string
  title: string
  path: string
  icon: ElementType
  moduleKey?: string
}

export interface WorkspaceSidebarSection {
  key: WorkspaceSidebarSectionKey
  title: string
  hint: string
  items: WorkspaceSidebarItem[]
}

const WORKSPACE_SIDEBAR_SECTIONS: WorkspaceSidebarSectionDefinition[] = [
  {
    key: 'central',
    title: 'Central',
    hint: 'Fila principal e execucao imediata',
    order: 0,
  },
  {
    key: 'execution',
    title: 'Execucao',
    hint: 'Projetos, atividades e priorizacao',
    order: 1,
  },
  {
    key: 'insights',
    title: 'Insights',
    hint: 'Analise e leitura do workspace',
    order: 2,
  },
  {
    key: 'administration',
    title: 'Administracao',
    hint: 'Estrutura, custos e configuracoes',
    order: 3,
  },
]

const WORKSPACE_MODULE_MANIFEST: Record<string, WorkspaceModuleManifestEntry> = {
  dashboard: {
    key: 'dashboard',
    title: 'Central de Tarefas',
    description: 'Painel principal da workspace.',
    entryPath: '/',
    icon: Dashboard,
    section: 'central',
    order: 0,
    visibleInSidebar: true,
  },
  ranking: {
    key: 'ranking',
    title: 'Ranking',
    description: 'Painel competitivo e acompanhamento de desempenho.',
    entryPath: '/ranking',
    icon: Trophy,
    section: 'central',
    order: 1,
    visibleInSidebar: true,
  },
  projects: {
    key: 'projects',
    title: 'Projetos e prioridades',
    navTitle: 'Projetos',
    description: 'Mapa, priorizacao e desenvolvimentos desta workspace.',
    entryPath: '/desenvolvimentos',
    icon: Code,
    section: 'execution',
    order: 2,
    visibleInSidebar: true,
  },
  activities: {
    key: 'activities',
    title: 'Atividades',
    description: 'Execucao das atividades e atribuicoes locais.',
    entryPath: '/atividades',
    icon: CheckSquare,
    section: 'execution',
    order: 3,
    visibleInSidebar: true,
  },
  indicators: {
    key: 'indicators',
    title: 'Indicadores',
    description: 'Leituras e comparativos do workspace.',
    entryPath: '/indicadores',
    icon: BarChart2,
    section: 'insights',
    order: 4,
    visibleInSidebar: true,
  },
  teams: {
    key: 'teams',
    title: 'Canva em Equipe',
    description: 'Quadro visual compartilhado (Excalidraw) com persistencia por workspace.',
    entryPath: '/canva-equipe',
    icon: MapIcon,
    section: 'execution',
    order: 5,
    visibleInSidebar: true,
  },
  org_chart: {
    key: 'org_chart',
    title: 'Organograma',
    description: 'Estrutura de pessoas e responsabilidades da workspace.',
    entryPath: '/organograma',
    icon: OrgChartIcon,
    section: 'administration',
    order: 6,
    visibleInSidebar: true,
    managerialOnly: true,
  },
  costs: {
    key: 'costs',
    title: 'Custos',
    description: 'Mapa de departamentos, custos fixos e pessoas da workspace.',
    entryPath: '/custos-departamento',
    icon: DollarSign,
    section: 'administration',
    order: 7,
    visibleInSidebar: true,
    managerialOnly: true,
  },
  gamification: {
    key: 'gamification',
    title: 'Gamificacao',
    description: 'Conquistas e progressao do workspace.',
    entryPath: '/conquistas',
    icon: Trophy,
    section: 'central',
    order: 8,
    visibleInSidebar: false,
  },
}

const STATIC_SIDEBAR_ITEMS: WorkspaceSidebarItem[] = [
  {
    key: 'prioridades',
    title: 'Prioridades',
    path: '/prioridades',
    icon: Flag,
    moduleKey: 'projects',
  },
  {
    key: 'mapa',
    title: 'Mapa',
    path: '/mapa',
    icon: MapIcon,
    moduleKey: 'projects',
  },
  {
    key: 'configuracoes',
    title: 'Configuracoes',
    path: '/configuracoes',
    icon: Settings,
  },
]

export function getWorkspaceModuleEntry(moduleKey: string): WorkspaceModuleManifestEntry | null {
  return WORKSPACE_MODULE_MANIFEST[moduleKey] ?? null
}

export function listWorkspaceModuleEntries(): WorkspaceModuleManifestEntry[] {
  return Object.values(WORKSPACE_MODULE_MANIFEST).sort((left, right) => left.order - right.order)
}

export function listWorkspaceVisibleModuleEntries(moduleKeys: string[]): WorkspaceModuleManifestEntry[] {
  const visibleKeys = new Set(moduleKeys)

  return listWorkspaceModuleEntries().filter((entry) => visibleKeys.has(entry.key))
}

export function resolveWorkspaceDefaultPath(moduleKeys: string[]): string {
  const firstVisibleEntry = listWorkspaceVisibleModuleEntries(moduleKeys).find(
    (entry) => entry.visibleInSidebar !== false,
  )

  if (firstVisibleEntry) {
    return firstVisibleEntry.entryPath
  }

  const firstAccessibleEntry = listWorkspaceVisibleModuleEntries(moduleKeys)[0]
  return firstAccessibleEntry?.entryPath ?? '/configuracoes'
}

export function listWorkspaceSidebarSections(moduleKeys: string[]): WorkspaceSidebarSection[] {
  const visibleKeys = new Set(moduleKeys)
  const moduleEntries = listWorkspaceModuleEntries().filter(
    (entry) => visibleKeys.has(entry.key) && entry.visibleInSidebar !== false,
  )

  const itemsBySection = new Map<WorkspaceSidebarSectionKey, WorkspaceSidebarItem[]>(
    WORKSPACE_SIDEBAR_SECTIONS.map((section) => [section.key, []]),
  )

  for (const entry of moduleEntries) {
    const sectionItems = itemsBySection.get(entry.section) ?? []
    sectionItems.push({
      key: entry.key,
      title: entry.navTitle ?? entry.title,
      path: entry.entryPath,
      icon: entry.icon,
      moduleKey: entry.key,
    })
    itemsBySection.set(entry.section, sectionItems)
  }

  for (const item of STATIC_SIDEBAR_ITEMS) {
    if (item.moduleKey && !visibleKeys.has(item.moduleKey)) {
      continue
    }

    const targetSection: WorkspaceSidebarSectionKey =
      item.key === 'configuracoes'
        ? 'administration'
        : item.key === 'mapa'
          ? 'insights'
          : 'execution'

    const sectionItems = itemsBySection.get(targetSection) ?? []
    sectionItems.push(item)
    itemsBySection.set(targetSection, sectionItems)
  }

  return WORKSPACE_SIDEBAR_SECTIONS
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((section) => ({
      key: section.key,
      title: section.title,
      hint: section.hint,
      items: (itemsBySection.get(section.key) ?? []).sort((left, right) => {
        const leftManifestOrder = getWorkspaceModuleEntry(left.moduleKey ?? '')?.order ?? Number.MAX_SAFE_INTEGER
        const rightManifestOrder = getWorkspaceModuleEntry(right.moduleKey ?? '')?.order ?? Number.MAX_SAFE_INTEGER
        if (leftManifestOrder !== rightManifestOrder) {
          return leftManifestOrder - rightManifestOrder
        }
        return left.title.localeCompare(right.title, 'pt-BR')
      }),
    }))
    .filter((section) => section.items.length > 0)
}
