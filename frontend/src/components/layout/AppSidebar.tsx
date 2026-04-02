import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Dashboard,
  MapIcon,
  Code,
  CheckSquare,
  Settings,
  ChevronLeft,
  Menu,
  BarChart2,
  Flag,
  Trophy,
  OrgChartIcon,
  DollarSign,
} from '@/components/ui/icons'
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
  Collapse,
  ButtonBase,
} from '@/compat/mui/material'
import type { Theme } from '@/compat/mui/styles'
import { ChevronDown, ChevronRight, Moon, Sun } from 'lucide-react'
import { useThemeMode } from '@/theme/ThemeProvider'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import type { UserProgress } from '@/types'
import { buildWorkspacePath, stripWorkspacePrefix } from '@/lib/workspace-routing'
import { useAuth } from '@/contexts/AuthContext'
import AppSurface from '@/components/system/AppSurface'
import StatusToken from '@/components/system/StatusToken'
import { listWorkspaceSidebarSections } from '@/features/workspace/module-manifest'
import {
  APP_SHELL_HEADER_HEIGHT,
  APP_SHELL_INFO_CARD_MIN_HEIGHT,
  APP_SHELL_SIDEBAR_COLLAPSED_WIDTH,
  APP_SHELL_SIDEBAR_EXPANDED_WIDTH,
} from './layout-shell'

type NavItem = {
  title: string
  url: string
  icon: React.ElementType
  permission: string | null
  requireRole?: string
  requireManagerial?: boolean
  moduleKey?: string
}
type NavSection = { title: string; hint: string; items: NavItem[] }

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    title: 'Central',
    hint: 'Fila principal e execução imediata',
    items: [
      { title: 'Central de Tarefas', url: '/', icon: Dashboard, permission: null, moduleKey: 'dashboard' },
      { title: 'Ranking', url: '/ranking', icon: Trophy, permission: null, moduleKey: 'ranking' },
    ],
  },
  {
    title: 'Execução',
    hint: 'Projetos, atividades e priorização',
    items: [
      { title: 'Projetos', url: '/desenvolvimentos', icon: Code, permission: 'access_desenvolvimentos', moduleKey: 'projects' },
      { title: 'Atividades', url: '/atividades', icon: CheckSquare, permission: 'access_atividades', moduleKey: 'activities' },
      { title: 'Prioridades', url: '/prioridades', icon: Flag, permission: null, moduleKey: 'projects' },
    ],
  },
  {
    title: 'Insights',
    hint: 'Análise e leitura do workspace',
    items: [
      { title: 'Indicadores', url: '/indicadores', icon: BarChart2, permission: null, moduleKey: 'indicators' },
      { title: 'Mapa', url: '/mapa', icon: MapIcon, permission: null, moduleKey: 'projects' },
    ],
  },
  {
    title: 'Administração',
    hint: 'Estrutura, custos e configurações',
    items: [
      { title: 'Canva em Equipe', url: '/canva-equipe', icon: MapIcon, permission: null, moduleKey: 'teams' },
      { title: 'Organograma', url: '/organograma', icon: OrgChartIcon, permission: null, requireManagerial: true, moduleKey: 'org_chart' },
      { title: 'Custos', url: '/custos-departamento', icon: DollarSign, permission: null, requireManagerial: true, moduleKey: 'costs' },
      { title: 'Configuracoes', url: '/configuracoes', icon: Settings, permission: null },
    ],
  },
]

interface AppSidebarProps {
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  pendingTodosCount: number | null
  progressData: UserProgress | null
  progressLoading: boolean
}

export function DemandCard({
  count,
  compact = false,
  headerInline = false,
  targetPath = '/',
}: {
  count: number | null
  compact?: boolean
  headerInline?: boolean
  targetPath?: string
}) {
  const resolvedCount = count ?? 0
  const hasPending = resolvedCount > 0
  const statusLabel = hasPending ? 'Abertas' : 'Em dia'
  const statusTone = hasPending ? 'warning' : 'success'
  const linkLabel = hasPending
    ? `Abrir minhas demandas, ${resolvedCount} itens em aberto`
    : 'Abrir minhas demandas, nenhuma pendência em aberto'

  if (headerInline) {
    return (
      <Box
        component={Link}
        to={targetPath}
        aria-label={linkLabel}
        sx={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          '&:focus-visible': {
            outline: 'none',
          },
          '&:focus-visible > *': {
            borderColor: 'primary.main',
            boxShadow: (theme: Theme) => `0 0 0 1px ${theme.palette.primary.main}`,
          },
        }}
      >
        <AppSurface
          compact
          surface={hasPending ? 'interactive' : 'subtle'}
          sx={{
            px: 1.125,
            py: 0.625,
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 3,
              alignSelf: 'stretch',
              borderRadius: '999px',
              bgcolor: hasPending ? 'warning.main' : 'success.main',
              opacity: hasPending ? 0.9 : 0.75,
              flexShrink: 0,
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Demandas
            </Typography>
            <Typography
              component="span"
              sx={{
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1,
                color: 'text.primary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {resolvedCount.toString().padStart(2, '0')}
            </Typography>
          </Box>
        </AppSurface>
      </Box>
    )
  }

  return (
    <Box
      component={Link}
      to={targetPath}
      aria-label={linkLabel}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        '&:focus-visible': {
          outline: 'none',
        },
        '&:focus-visible > *': {
          borderColor: 'primary.main',
          boxShadow: (theme: Theme) => `0 0 0 1px ${theme.palette.primary.main}`,
        },
      }}
    >
      <AppSurface
        compact={compact}
        surface={hasPending ? 'interactive' : 'subtle'}
        sx={{
          px: compact ? 1.125 : 1.25,
          py: compact ? 0.875 : 1,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '4px minmax(0, 1fr)',
            gap: 1,
            alignItems: 'stretch',
          }}
        >
          <Box
            aria-hidden
            sx={{
              borderRadius: '999px',
              bgcolor: hasPending ? 'warning.main' : 'success.main',
              opacity: hasPending ? 0.9 : 0.75,
              minHeight: 42,
            }}
          />

          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.45, justifyContent: 'center' }}>
            <Typography
              component="span"
              sx={{
                fontSize: 13,
                lineHeight: 1.2,
                fontWeight: 700,
                color: 'text.secondary',
              }}
            >
              Minhas demandas
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography
                component="span"
                sx={{
                  fontSize: '1.55rem',
                  lineHeight: 1,
                  fontWeight: 700,
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.03em',
                }}
              >
                {resolvedCount.toString().padStart(2, '0')}
              </Typography>

              <StatusToken tone={statusTone} sx={{ alignSelf: 'center' }}>
                {statusLabel}
              </StatusToken>
            </Box>
          </Box>
        </Box>
      </AppSurface>
    </Box>
  )
}

export function AppSidebar(props: AppSidebarProps) {
  const {
    isCollapsed: controlledCollapsed,
    onCollapsedChange,
    pendingTodosCount,
  } = props
  const location = useLocation()
  const theme = useTheme()
  const { mode, toggleTheme } = useThemeMode()
  const { currentWorkspace } = useAuth()
  const {
    gamificationEnabled,
    canManageWorkspace,
    moduleCapabilities,
    visibleModuleKeys,
  } = useWorkspaceContext(currentWorkspace?.slug ?? null)
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string>('Central')
  const isCollapsed = controlledCollapsed ?? internalCollapsed

  const setIsCollapsed = (value: boolean) => {
    onCollapsedChange?.(value)
    if (!onCollapsedChange) setInternalCollapsed(value)
  }

  const normalizedPath = stripWorkspacePrefix(location.pathname)
  const visibleModuleKeySet = useMemo(() => new Set(visibleModuleKeys), [visibleModuleKeys])
  const visibleSections = useMemo(() => {
    if (visibleModuleKeys.length > 0 || Object.keys(moduleCapabilities).length > 0) {
      return listWorkspaceSidebarSections(visibleModuleKeys).map((section) => ({
        title: section.title,
        hint: section.hint,
        items: section.items.map((item) => ({
          title: item.title,
          url: item.path,
          icon: item.icon,
          permission: null,
          requireRole: undefined,
          requireManagerial: undefined,
          moduleKey: item.moduleKey,
        })),
      }))
    }

    return SIDEBAR_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.moduleKey) {
          const capability = moduleCapabilities[item.moduleKey]
          const isModuleVisible =
            capability?.is_visible ??
            visibleModuleKeySet.has(item.moduleKey)

          if (!isModuleVisible) {
            return false
          }
        }
        if (item.requireManagerial && !canManageWorkspace) {
          return false
        }
        return true
      }),
    })).filter((section) => section.items.length > 0)
  }, [canManageWorkspace, moduleCapabilities, visibleModuleKeySet, visibleModuleKeys])

  useEffect(() => {
    const activeSection = visibleSections.find((section) =>
      section.items.some((item) => (item.url === '/' ? normalizedPath === '/' : normalizedPath === item.url || normalizedPath.startsWith(`${item.url}/`))),
    )
    if (activeSection?.title) setExpandedSection(activeSection.title)
  }, [normalizedPath, visibleSections])

  const workspaceRoot = currentWorkspace?.slug ? buildWorkspacePath(currentWorkspace.slug) : '/'
  const sidebarWidth = isCollapsed ? APP_SHELL_SIDEBAR_COLLAPSED_WIDTH : APP_SHELL_SIDEBAR_EXPANDED_WIDTH
  const isActiveLink = (url: string) =>
    url === '/'
      ? normalizedPath === '/'
      : normalizedPath === url || normalizedPath.startsWith(`${url}/`)

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: '0 auto 0 0',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${theme.palette.divider}`,
        zIndex: 1200,
        width: sidebarWidth,
        transition: theme.transitions.create('width', { duration: 180 }),
        bgcolor: 'background.paper',
        color: 'text.primary',
        boxShadow: 'inset -1px 0 0 rgba(0, 0, 0, 0.03)',
      }}
    >
      <Box
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          minHeight: APP_SHELL_HEADER_HEIGHT,
          py: 1.5,
          px: isCollapsed ? 1 : 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: 1,
          flexShrink: 0,
        }}
      >
        {isCollapsed ? (
          <Tooltip title={currentWorkspace?.name ?? 'Central de Tarefas'} placement="right">
            <Box
              component={Link}
              to={workspaceRoot}
              sx={{
                width: 38,
                height: 38,
                display: 'grid',
                placeItems: 'center',
                textDecoration: 'none',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 'var(--radius-sm)',
                color: 'text.primary',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.06em',
              }}
            >
              CDT
            </Box>
          </Tooltip>
        ) : (
          <>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'text.primary',
                  letterSpacing: '-0.01em',
                }}
                noWrap
              >
                Central
              </Typography>
            </Box>
            <IconButton onClick={() => setIsCollapsed(true)} size="small" aria-label="Recolher sidebar">
              <ChevronLeft size={16} />
            </IconButton>
          </>
        )}

        {isCollapsed ? (
          <IconButton onClick={() => setIsCollapsed(false)} size="small" aria-label="Expandir sidebar">
            <Menu size={16} />
          </IconButton>
        ) : null}
      </Box>

      {!isCollapsed ? (
        <Box sx={{ px: 1.25, pt: 1.25, pb: 0.5 }}>
          <DemandCard count={pendingTodosCount} targetPath={buildWorkspacePath(currentWorkspace?.slug)} />
        </Box>
      ) : null}

      <Box sx={{ flex: 1, overflowY: 'auto', px: isCollapsed ? 0.75 : 1, py: 1.5 }}>
        {isCollapsed ? (
          <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {visibleSections.flatMap((section) => section.items).map((item) => {
              const Icon = item.icon
              const active = isActiveLink(item.url)
              return (
                <Tooltip key={item.url} title={item.title} placement="right">
                  <Box
                    component={Link}
                    to={buildWorkspacePath(currentWorkspace?.slug, item.url)}
                    sx={{
                      width: '100%',
                      height: 40,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 'var(--radius-sm)',
                      color: active ? 'primary.main' : 'text.secondary',
                      bgcolor: active ? 'action.selected' : 'transparent',
                      textDecoration: 'none',
                      border: '1px solid',
                      borderColor: active ? 'primary.main' : 'transparent',
                    }}
                  >
                    <Icon size={16} />
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {visibleSections.map((section) => {
              const isExpanded = expandedSection === section.title
              return (
                <Box key={section.title}>
                  <ButtonBase
                    onClick={() => setExpandedSection((current) => (current === section.title ? '' : section.title))}
                    sx={{
                      width: '100%',
                      px: 1,
                      py: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        {section.title}
                      </Typography>
                    </Box>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </ButtonBase>

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box component="nav" sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                      {section.items.map((item) => {
                        const Icon = item.icon
                        const active = isActiveLink(item.url)
                        return (
                          <Box
                            key={item.url}
                            component={Link}
                            to={buildWorkspacePath(currentWorkspace?.slug, item.url)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.25,
                              px: 1,
                              py: 0.95,
                              borderRadius: 'var(--radius-sm)',
                              textDecoration: 'none',
                              color: active ? 'primary.main' : 'text.primary',
                              bgcolor: active ? 'action.selected' : 'transparent',
                              border: '1px solid',
                              borderColor: active ? 'primary.main' : 'transparent',
                              transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                            }}
                          >
                            <Icon size={16} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {item.title}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Box>
                  </Collapse>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          p: isCollapsed ? 0.75 : 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          flexShrink: 0,
        }}
      >
        <Tooltip title={isCollapsed ? (mode === 'light' ? 'Modo escuro' : 'Modo claro') : undefined} placement="right">
          <ButtonBase
            onClick={toggleTheme}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              width: '100%',
              px: isCollapsed ? 0 : 1,
              py: 1,
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${theme.palette.divider}`,
              color: 'text.secondary',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            {mode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {!isCollapsed ? (
              <Box component="span" sx={{ fontSize: 13, fontWeight: 600 }}>
                {mode === 'light' ? 'Modo escuro' : 'Modo claro'}
              </Box>
            ) : null}
          </ButtonBase>
        </Tooltip>

        {!isCollapsed ? (
          <>
            <AppSurface
              surface="subtle"
              sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                p: 1.25,
                minHeight: APP_SHELL_INFO_CARD_MIN_HEIGHT,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {gamificationEnabled ? 'Perfil e progresso' : 'Perfil'}
                </Typography>
                <StatusToken tone="neutral">
                  Via avatar
                </StatusToken>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                {gamificationEnabled
                  ? 'Conquistas, níveis e preferências pessoais continuam acessíveis pelo drawer de perfil no cabeçalho.'
                  : 'Preferências pessoais e dados do workspace continuam acessíveis pelo drawer de perfil no cabeçalho.'}
              </Typography>
            </AppSurface>
          </>
        ) : (
          <Tooltip title="Workspace atual" placement="right">
            <Box
              component={Link}
              to={workspaceRoot}
              sx={{
                textDecoration: 'none',
                display: 'grid',
                placeItems: 'center',
                height: 40,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: theme.palette.divider,
                color: 'text.secondary',
              }}
            >
              <Code size={16} />
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}
