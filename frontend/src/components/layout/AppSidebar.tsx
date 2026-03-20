import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Dashboard,
  MapIcon,
  Code,
  CheckSquare,
  Settings,
  Trophy,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Menu,
  BarChart2,
  Paintbrush,
  Flag,
  Person,
  TrendingUp,
  OrgChartIcon,
  DollarSign,
} from '@/components/ui/icons';
import { Avatar, Box, Divider, IconButton, Menu as MuiMenu, MenuItem, Tooltip, Typography, useTheme } from '@mui/material';
import { UserLevelProfileDrawer } from '@/components/layout/UserLevelProfileDrawer';
import { Sun, Moon } from 'lucide-react';
import { useThemeMode } from '@/theme/ThemeProvider';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProgress } from '@/hooks/use-user-progress';
import { LevelXpBar } from '@/components/master-mode/LevelXpBar';
import { getTierForLevel } from '@/utils/tier';

type NavItem = { title: string; url: string; icon: React.ElementType; permission: string | null; requireRole?: string };

const SIDEBAR_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'INSIGHT',
    items: [
      { title: 'Dashboard', url: '/', icon: Dashboard, permission: null },
      { title: 'Mapa', url: '/mapa', icon: MapIcon, permission: null },
      { title: 'Prioridades', url: '/prioridades', icon: Flag, permission: null },
      { title: 'Indicadores', url: '/indicadores', icon: BarChart2, permission: null },
    ],
  },
  {
    title: 'FERRAMENTAS',
    items: [
      { title: 'Desenvolvimentos', url: '/desenvolvimentos', icon: Code, permission: 'access_desenvolvimentos' },
      { title: 'Atividades', url: '/atividades', icon: CheckSquare, permission: 'access_atividades' },
      { title: 'Canva em Equipe', url: '/canva-equipe', icon: Paintbrush, permission: null },
      { title: 'Organograma', url: '/organograma', icon: OrgChartIcon, permission: null, requireRole: 'admin' },
      { title: 'Custos', url: '/custos-departamento', icon: DollarSign, permission: null, requireRole: 'admin' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [{ title: 'Configurações', url: '/configuracoes', icon: Settings, permission: null }],
  },
];

// Submenu do card de nível (abre à direita ao clicar no card)
const LEVEL_CARD_MENU_ITEMS: { title: string; url: string; icon: React.ElementType; iconStyle?: React.CSSProperties }[] = [
  { title: 'Ver Meu Nível', url: '/perfil', icon: Person },
  { title: 'Conquistas', url: '/conquistas', icon: Trophy, iconStyle: { color: '#F59E0B' } },
  { title: 'Progressão', url: '/niveis', icon: TrendingUp },
  { title: 'Como Funciona?', url: '/tutorial', icon: HelpCircle },
];

interface AppSidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AppSidebar(props: AppSidebarProps = {}) {
  const { isCollapsed: controlledCollapsed, onCollapsedChange } = props;
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const { mode, toggleTheme } = useThemeMode();
  const { hasPermission, hasRole } = usePermissions();
  const { logout, currentUser } = useAuth();
  const { data: progressData, loading: progressLoading } = useUserProgress();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [levelMenuAnchor, setLevelMenuAnchor] = useState<HTMLElement | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  const setIsCollapsed = (v: boolean) => {
    onCollapsedChange?.(v);
    if (!onCollapsedChange) setInternalCollapsed(v);
  };

  const visibleSections = useMemo(() => {
    return SIDEBAR_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.requireRole) return hasRole(item.requireRole);
        if (item.permission) return hasPermission(item.permission);
        return true;
      }),
    })).filter((s) => s.items.length > 0);
  }, [hasPermission, hasRole]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebarBg = isLight ? '#ffffff' : theme.palette.background.default;
  const borderColor = theme.palette.divider;
  const activeColor = theme.palette.primary.main;
  const hoverBg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)';

  const isActiveLink = (url: string) =>
    url === '/configuracoes'
      ? location.pathname === '/configuracoes' || location.pathname.startsWith('/configuracoes/')
      : location.pathname === url;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${borderColor}`,
        zIndex: 1200,
        width: isCollapsed ? 72 : 256,
        transition: theme.transitions.create('width', { duration: 250 }),
        bgcolor: sidebarBg,
        color: 'text.primary',
      }}
    >
      {/* Header */}
      {isCollapsed ? (
        <Box sx={{ borderBottom: `1px solid ${borderColor}`, flexShrink: 0 }}>
          <Box sx={{ minHeight: 56, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, letterSpacing: 0.2 }}>CDT</Typography>
          </Box>
          <Tooltip title="Expandir" placement="right">
            <IconButton
              onClick={() => setIsCollapsed(false)}
              sx={{ width: '100%', borderRadius: 0, py: 1.25 }}
              size="small"
            >
              <Menu size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box
          sx={{
            borderBottom: `1px solid ${borderColor}`,
            minHeight: 56,
            py: 2,
            px: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.4, color: 'text.primary', lineHeight: 1.25 }}>
            Central de Tarefas
          </Typography>
          <Tooltip title="Recolher">
            <IconButton onClick={() => setIsCollapsed(true)} size="small" sx={{ ml: 'auto', mr: -0.5 }}>
              <ChevronLeft size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Navigation */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 2.5,
          px: isCollapsed ? 0.75 : 1.5,
        }}
      >
        {visibleSections.map((section, sectionIndex) => (
          <Box key={section.title}>
            {sectionIndex > 0 && (
              <Divider sx={{ borderColor: borderColor, my: 2 }} />
            )}
            {!isCollapsed && (
              <Box
                component="p"
                sx={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  color: 'text.disabled',
                  mt: sectionIndex === 0 ? 0 : 0.5,
                  px: 1.5,
                  m: 0,
                  mb: 1,
                }}
              >
                {section.title}
              </Box>
            )}
            <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: sectionIndex < visibleSections.length - 1 ? 2.5 : 0 }}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActiveLink(item.url);
                const link = (
                  <Box sx={{ position: 'relative' }}>
                    {active && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          height: '60%',
                          width: 3,
                          borderRadius: '0 2px 2px 0',
                          bgcolor: activeColor,
                          zIndex: 1,
                        }}
                      />
                    )}
                    <Link
                      to={item.url}
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        borderRadius: 6,
                        padding: isCollapsed ? '10px 0' : '10px 12px',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: 12,
                        backgroundColor: active
                          ? isLight ? 'rgba(37,99,235,0.08)' : 'rgba(96,165,250,0.12)'
                          : 'transparent',
                        color: active ? activeColor : 'inherit',
                        transition: 'background-color 0.15s, color 0.15s',
                      }}
                      onMouseOver={(e) => {
                        if (!active) e.currentTarget.style.backgroundColor = hoverBg;
                      }}
                      onMouseOut={(e) => {
                        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Icon size={16} style={{ flexShrink: 0 }} />
                      {!isCollapsed && (
                        <Box
                          component="span"
                          sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </Box>
                      )}
                    </Link>
                  </Box>
                );
                return isCollapsed ? (
                  <Tooltip key={item.url} title={item.title} placement="right">
                    <Box>{link}</Box>
                  </Tooltip>
                ) : (
                  <Box key={item.url}>{link}</Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          borderTop: `1px solid ${borderColor}`,
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          flexShrink: 0,
        }}
      >
        {/* Seletor de tema — acima do nível */}
        <Tooltip title={isCollapsed ? (mode === 'light' ? 'Modo escuro' : 'Modo claro') : undefined} placement="right">
          <Box
            component="button"
            type="button"
            onClick={toggleTheme}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              width: '100%',
              px: isCollapsed ? 0 : 1,
              py: 0.75,
              borderRadius: 1.5,
              border: `1px solid ${borderColor}`,
              cursor: 'pointer',
              bgcolor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
              color: 'text.secondary',
              textAlign: 'left',
              transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              mb: 0.5,
              '&:hover': {
                color: 'primary.main',
                borderColor: theme.palette.primary.main,
                bgcolor: isLight ? 'rgba(37,99,235,0.06)' : 'rgba(96,165,250,0.1)',
              },
            }}
          >
            <span style={{ display: 'inline-flex', flexShrink: 0 }}>
              {mode === 'light' ? <Moon size={16} style={{ flexShrink: 0 }} /> : <Sun size={16} style={{ flexShrink: 0 }} />}
            </span>
            {!isCollapsed && (
              <Box component="span" sx={{ fontSize: 13, fontWeight: 600 }}>
                {mode === 'light' ? 'Modo escuro' : 'Modo claro'}
              </Box>
            )}
          </Box>
        </Tooltip>

        {/* Card de nível — ao clicar abre submenu à direita com: Ver Meu Nível, Conquistas, Progressão, Como Funciona? */}
        <Tooltip title={isCollapsed ? 'Nível e mais opções' : undefined} placement="right">
          <Box
            component="button"
            type="button"
            onClick={(e) => setLevelMenuAnchor(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              width: '100%',
              px: isCollapsed ? 0 : 1,
              py: 0.75,
              borderRadius: 1.5,
              border: `1px solid ${borderColor}`,
              cursor: 'pointer',
              bgcolor: 'transparent',
              color: 'inherit',
              textAlign: 'left',
              transition: 'border-color 0.15s, background-color 0.15s',
              '&:hover': {
                borderColor: theme.palette.secondary.main,
                bgcolor: isLight ? 'rgba(124,58,237,0.05)' : 'rgba(167,139,250,0.08)',
              },
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              mb: 0.5,
            }}
          >
            <Box
              component="span"
              sx={{
                width: 26,
                height: 26,
                borderRadius: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: isLight ? 'rgba(124,58,237,0.1)' : 'rgba(167,139,250,0.15)',
                color: 'secondary.main',
              }}
            >
              <span style={{ display: 'inline-flex' }}>
                <BarChart2 size={14} />
              </span>
            </Box>
            {!isCollapsed && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <LevelXpBar progress={progressData} loading={progressLoading} compact />
                {progressData?.level != null && (() => {
                  const t = getTierForLevel(progressData.level);
                  return (
                    <Typography
                      variant="caption"
                      sx={{ fontSize: 10, fontWeight: 600, color: t.color, lineHeight: 1, display: 'block', mt: 0.25 }}
                    >
                      {t.name}
                    </Typography>
                  );
                })()}
              </Box>
            )}
          </Box>
        </Tooltip>

        <MuiMenu
          anchorEl={levelMenuAnchor}
          open={Boolean(levelMenuAnchor)}
          onClose={() => setLevelMenuAnchor(null)}
          anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
          transformOrigin={{ vertical: 'center', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                minWidth: 200,
                mt: 0,
                ml: 0.5,
                borderRadius: 2,
                boxShadow: theme.shadows[8],
              },
            },
          }}
        >
          {LEVEL_CARD_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.url;
            return (
              <MenuItem
                key={item.url}
                onClick={() => {
                  setLevelMenuAnchor(null);
                  navigate(item.url);
                }}
                sx={{
                  gap: 1.5,
                  py: 1.25,
                  fontSize: 13,
                  fontWeight: 600,
                  color: active ? activeColor : 'text.primary',
                }}
              >
                <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                  <Icon size={18} style={{ flexShrink: 0, ...item.iconStyle }} />
                </span>
                {item.title}
              </MenuItem>
            );
          })}
        </MuiMenu>

        <Divider sx={{ borderColor: borderColor, my: 0.5 }} />

        {/* User row: abre painel nível + indicadores; logout */}
        {!isCollapsed && currentUser ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 0.5,
              width: '100%',
              px: 0.5,
              py: 0.5,
            }}
          >
            <Tooltip title="Meu perfil, nível e indicadores" placement="right">
              <Box
                component="button"
                type="button"
                onClick={() => setProfileDrawerOpen(true)}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  padding: '4px 6px',
                  margin: '-4px -6px',
                  borderRadius: 1,
                  color: isActiveLink('/perfil') ? activeColor : theme.palette.text.primary,
                  overflow: 'hidden',
                  textAlign: 'left',
                  transition: 'color 0.15s, background-color 0.15s',
                  '&:hover': {
                    color: activeColor,
                    bgcolor: hoverBg,
                  },
                }}
              >
                <Person size={14} style={{ flexShrink: 0 }} />
                <Box
                  component="span"
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {currentUser.name}
                </Box>
              </Box>
            </Tooltip>
            <Tooltip title="Sair" placement="right">
              <IconButton
                onClick={handleLogout}
                sx={{
                  borderRadius: 1,
                  p: 0.5,
                  color: 'error.main',
                  '&:hover': { bgcolor: 'error.light', color: 'error.dark' },
                }}
                size="small"
              >
                <LogOut size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : currentUser ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '100%' }}>
            <Tooltip title="Meu perfil, nível e indicadores" placement="right">
              <IconButton
                onClick={() => setProfileDrawerOpen(true)}
                size="small"
                sx={{
                  borderRadius: 2,
                  p: 0.25,
                  border: `1px solid ${borderColor}`,
                  '&:hover': { bgcolor: hoverBg },
                }}
              >
                <Avatar
                  src={currentUser.avatar_url ?? undefined}
                  sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 700 }}
                >
                  {currentUser.name?.[0]?.toUpperCase() ?? '?'}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Tooltip title="Sair" placement="right">
              <IconButton
                onClick={handleLogout}
                sx={{
                  width: '100%',
                  borderRadius: 1,
                  justifyContent: 'center',
                  py: 0.5,
                  color: 'error.main',
                  '&:hover': { bgcolor: 'error.light', color: 'error.dark' },
                }}
                size="small"
              >
                <LogOut size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Tooltip title={isCollapsed ? 'Sair' : undefined} placement="right">
            <IconButton
              onClick={handleLogout}
              sx={{
                width: '100%',
                borderRadius: 1,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                py: 0.875,
                px: isCollapsed ? 0 : 1.25,
                gap: 1,
                color: 'error.main',
                '&:hover': { bgcolor: 'error.light', color: 'error.dark' },
              }}
              size="small"
            >
              <LogOut size={16} />
              {!isCollapsed && <Box component="span" sx={{ fontSize: 13, fontWeight: 600 }}>Sair</Box>}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <UserLevelProfileDrawer open={profileDrawerOpen} onClose={() => setProfileDrawerOpen(false)} />
    </Box>
  );
}
