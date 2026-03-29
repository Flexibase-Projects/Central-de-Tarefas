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
} from '@mui/material'
import { ChevronDown, ChevronRight, Moon, Sun } from 'lucide-react'
import { useThemeMode } from '@/theme/ThemeProvider'
import { usePermissions } from '@/hooks/use-permissions'
import type { UserProgress } from '@/types'
import { buildWorkspacePath, stripWorkspacePrefix } from '@/lib/workspace-routing'
import { useAuth } from '@/contexts/AuthContext'
import AppSurface from '@/components/system/AppSurface'
import StatusToken from '@/components/system/StatusToken'

type NavItem = { title: string; url: string; icon: React.ElementType; permission: string | null; requireRole?: string }
type NavSection = { title: string; hint: string; items: NavItem[] }

const SIDEBAR_EXPANDED_WIDTH = 248
const SIDEBAR_COLLAPSED_WIDTH = 72

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    title: 'Central',
    hint: 'Fila principal e execução imediata',
    items: [
      { title: 'Central de Tarefas', url: '/', icon: Dashboard, permission: null },
    ],
  },
  {
    title: 'Execução',
    hint: 'Projetos, atividades e priorização',
    items: [
      { title: 'Projetos', url: '/desenvolvimentos', icon: Code, permission: 'access_desenvolvimentos' },
      { title: 'Atividades', url: '/atividades', icon: CheckSquare, permission: 'access_atividades' },
      { title: 'Prioridades', url: '/prioridades', icon: Flag, permission: null },
    ],
  },
  {
    title: 'Insights',
    hint: 'Análise e leitura do workspace',
    items: [
      { title: 'Indicadores', url: '/indicadores', icon: BarChart2, permission: null },
      { title: 'Mapa', url: '/mapa', icon: MapIcon, permission: null },
    ],
  },
  {
    title: 'Administração',
    hint: 'Estrutura, custos e configurações',
    items: [
      { title: 'Organograma', url: '/organograma', icon: OrgChartIcon, permission: null, requireRole: 'admin' },
      { title: 'Custos', url: '/custos-departamento', icon: DollarSign, permission: null, requireRole: 'admin' },
      { title: 'Configuracoes', url: '/configuracoes', icon: Settings, permission: null, requireRole: 'admin' },
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

  if (headerInline) {
    return (
      <Box
        component={Link}
        to={targetPath}
        sx={{
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <AppSurface
          compact
          surface={hasPending ? 'interactive' : 'subtle'}
          sx={{
            px: 1.25,
            py: 0.75,
            minHeight: 38,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Demandas
          </Typography>
          <StatusToken tone={hasPending ? 'warning' : 'neutral'}>
            {resolvedCount.toString().padStart(2, '0')}
          </StatusToken>
        </AppSurface>
      </Box>
    )
  }

  return (
    <Box
      component={Link}
      to={targetPath}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <AppSurface compact={compact} surface={hasPending ? 'interactive' : 'subtle'}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
          Minhas demandas
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h4" sx={{ fontSize: '1.125rem' }}>
            {resolvedCount.toString().padStart(2, '0')}
          </Typography>
          <StatusToken tone={hasPending ? 'warning' : 'neutral'}>
            {hasPending ? 'Em aberto' : 'Resolvidas'}
          </StatusToken>
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
  const { hasPermission, hasRole } = usePermissions()
  const { currentWorkspace } = useAuth()
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string>('Central')
  const isCollapsed = controlledCollapsed ?? internalCollapsed

  const setIsCollapsed = (value: boolean) => {
    onCollapsedChange?.(value)
    if (!onCollapsedChange) setInternalCollapsed(value)
  }

  const normalizedPath = stripWorkspacePrefix(location.pathname)
  const visibleSections = useMemo(() => {
    return SIDEBAR_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.requireRole) return hasRole(item.requireRole)
        if (item.permission) return hasPermission(item.permission)
        return true
      }),
    })).filter((section) => section.items.length > 0)
  }, [hasPermission, hasRole])

  useEffect(() => {
    const activeSection = visibleSections.find((section) =>
      section.items.some((item) => (item.url === '/' ? normalizedPath === '/' : normalizedPath === item.url || normalizedPath.startsWith(`${item.url}/`))),
    )
    if (activeSection?.title) setExpandedSection(activeSection.title)
  }, [normalizedPath, visibleSections])

  const workspaceRoot = currentWorkspace?.slug ? buildWorkspacePath(currentWorkspace.slug) : '/'
  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
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
        bgcolor: 'background.default',
        color: 'text.primary',
        boxShadow: 'inset -1px 0 0 rgba(0, 0, 0, 0.03)',
      }}
    >
      <Box
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          minHeight: 64,
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
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                Central de Tarefas
              </Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }} noWrap>
                {currentWorkspace?.name || 'Workspace'}
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
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Perfil e progresso
                </Typography>
                <StatusToken tone="neutral">
                  Via avatar
                </StatusToken>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                Conquistas, níveis e preferências pessoais continuam acessíveis pelo drawer de perfil no cabeçalho.
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
