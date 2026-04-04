import { IconButton, Tooltip } from '@/compat/mui/material'
import { alpha, type Theme } from '@/compat/mui/styles'
import { Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useThemeMode } from '@/theme/ThemeProvider'

function isPreLoginPath(pathname: string): boolean {
  if (pathname === '/workspaces') return true
  if (pathname === '/admin/login') return true
  if (pathname === '/auth/callback') return true
  return /^\/w\/[^/]+\/login$/.test(pathname)
}

/**
 * Botão flutuante padrão (canto superior direito) nas telas públicas antes do login.
 * Montar uma única vez dentro de `<Router>`.
 */
export function FloatingPreLoginThemeToggleHost() {
  const { pathname } = useLocation()
  if (!isPreLoginPath(pathname)) return null
  return <FloatingPreLoginThemeToggle />
}

function FloatingPreLoginThemeToggle() {
  const { mode, toggleTheme } = useThemeMode()
  const isLight = mode === 'light'

  return (
    <Tooltip title={isLight ? 'Tema escuro' : 'Tema claro'}>
      <IconButton
        onClick={toggleTheme}
        color="inherit"
        size="small"
        aria-label={isLight ? 'Ativar tema escuro' : 'Ativar tema claro'}
        sx={(theme: Theme) => ({
          position: 'fixed',
          /** Mesmo grid de `Workspaces` e funil público: canto superior direito do conteúdo, não do viewport solto. */
          top: {
            xs: `max(${theme.spacing(3)}, env(safe-area-inset-top, 0px))`,
            md: `max(${theme.spacing(5)}, env(safe-area-inset-top, 0px))`,
          },
          right: {
            xs: `max(${theme.spacing(2)}, env(safe-area-inset-right, 0px))`,
            md: `max(${theme.spacing(4)}, env(safe-area-inset-right, 0px))`,
          },
          zIndex: 1400,
          color: 'text.secondary',
          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.75 : 0.92),
          border: '1px solid',
          borderColor: 'divider',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 4px 20px rgba(0,0,0,0.35)'
              : '0 4px 16px rgba(15, 23, 42, 0.08)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          '&:hover': {
            bgcolor: 'action.hover',
            color: 'text.primary',
          },
        })}
      >
        {isLight ? <Moon size={18} /> : <Sun size={18} />}
      </IconButton>
    </Tooltip>
  )
}
