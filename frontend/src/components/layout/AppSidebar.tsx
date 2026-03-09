import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Dashboard,
  Map,
  Code,
  CheckBox,
  Settings,
  Brightness7,
  Brightness4,
  Help,
  ExitToApp,
  ChevronLeft,
  Menu,
  BarChart,
  Brush,
  Flag,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/theme/ThemeProvider';

type NavItem = { title: string; url: string; icon: React.ElementType; permission: string | null; requireRole?: string };

const SIDEBAR_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'INSIGHT',
    items: [
      { title: 'Dashboard', url: '/', icon: Dashboard, permission: null },
      { title: 'Mapa', url: '/mapa', icon: Map, permission: null },
      { title: 'Prioridades', url: '/prioridades', icon: Flag, permission: null },
      { title: 'Indicadores', url: '/indicadores', icon: BarChart, permission: null },
    ],
  },
  {
    title: 'FERRAMENTAS',
    items: [
      { title: 'Desenvolvimentos', url: '/desenvolvimentos', icon: Code, permission: 'access_desenvolvimentos' },
      { title: 'Atividades', url: '/atividades', icon: CheckBox, permission: 'access_atividades' },
      { title: 'Canva em Equipe', url: '/canva-equipe', icon: Brush, permission: null },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { title: 'Administração', url: '/admin', icon: Settings, permission: null, requireRole: 'admin' },
    ],
  },
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
  const { mode, toggleMode } = useThemeMode();
  const { hasPermission, hasRole } = usePermissions();
  const { logout, currentUser } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
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

  const isDark = mode === 'dark';

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        zIndex: 1200,
        width: isCollapsed ? 72 : 240,
        transition: theme.transitions.create('width', { duration: 300 }),
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      {/* Header */}
      {isCollapsed ? (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box sx={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Code sx={{ fontSize: 18 }} />
            </Box>
          </Box>
          <Tooltip title="Expandir">
            <IconButton
              onClick={() => setIsCollapsed(false)}
              sx={{ width: '100%', borderRadius: 0, py: 1.25 }}
              size="small"
            >
              <Menu sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            height: 56,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Code sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Box sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>CDT Inteligência</Box>
            <Box sx={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
              Central de Tarefas
            </Box>
          </Box>
          <Tooltip title="Recolher">
            <IconButton onClick={() => setIsCollapsed(true)} size="small">
              <ChevronLeft sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        {visibleSections.map((section) => (
          <Box key={section.title} sx={{ mb: 2, px: isCollapsed ? 1 : 2 }}>
            {!isCollapsed && (
              <Box
                component="h2"
                sx={{
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: 'text.secondary',
                  mb: 1,
                  px: 1,
                  m: 0,
                }}
              >
                {section.title}
              </Box>
            )}
            <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.url;
                const link = (
                  <Link
                    to={item.url}
                    style={{
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      borderRadius: 6,
                      padding: isCollapsed ? 8 : '6px 8px',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      gap: 8,
                      backgroundColor: isActive ? theme.palette.primary.main : 'transparent',
                      color: isActive ? theme.palette.primary.contrastText : 'inherit',
                      transition: 'background-color 0.2s, color 0.2s',
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = theme.palette.action.hover;
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Icon sx={{ fontSize: 18, flexShrink: 0 }} />
                    {!isCollapsed && (
                      <>
                        <Box component="span" sx={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </Box>
                        {isActive && (
                          <Box
                            sx={{
                              ml: 'auto',
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: 'primary.contrastText',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </>
                    )}
                  </Link>
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
      <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1, display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
        <Tooltip title={isCollapsed ? (isDark ? 'Modo Claro' : 'Modo Escuro') : undefined} placement="right">
          <IconButton
            onClick={toggleMode}
            sx={{ width: '100%', borderRadius: 1, justifyContent: isCollapsed ? 'center' : 'flex-start', py: 1 }}
            size="small"
          >
            {isDark ? <Brightness7 sx={{ fontSize: 18 }} /> : <Brightness4 sx={{ fontSize: 18 }} />}
            {!isCollapsed && <Box component="span" sx={{ ml: 1, fontSize: 12, fontWeight: 500 }}>{isDark ? 'Claro' : 'Escuro'}</Box>}
          </IconButton>
        </Tooltip>
        <Tooltip title={isCollapsed ? 'Ajuda' : undefined} placement="right">
          <IconButton sx={{ width: '100%', borderRadius: 1, justifyContent: isCollapsed ? 'center' : 'flex-start', py: 1 }} size="small">
            <Help sx={{ fontSize: 18 }} />
            {!isCollapsed && <Box component="span" sx={{ ml: 1, fontSize: 12, fontWeight: 500 }}>Ajuda</Box>}
          </IconButton>
        </Tooltip>
        <Tooltip title={isCollapsed ? 'Sair' : undefined} placement="right">
          <IconButton
            onClick={handleLogout}
            sx={{
              width: '100%',
              borderRadius: 1,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              py: 1,
              color: 'error.main',
              '&:hover': { bgcolor: 'error.light', color: 'error.dark' },
            }}
            size="small"
          >
            <ExitToApp sx={{ fontSize: 18 }} />
            {!isCollapsed && <Box component="span" sx={{ ml: 1, fontSize: 12, fontWeight: 500 }}>Sair</Box>}
          </IconButton>
        </Tooltip>
        {!isCollapsed && currentUser && (
          <Box sx={{ px: 1, py: 0.5, fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser.name}
          </Box>
        )}
      </Box>
    </Box>
  );
}
