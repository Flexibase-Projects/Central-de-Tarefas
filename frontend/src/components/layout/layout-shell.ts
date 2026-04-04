export const APP_SHELL_HEADER_HEIGHT = 64
export const APP_SHELL_SIDEBAR_EXPANDED_WIDTH = 248
export const APP_SHELL_SIDEBAR_COLLAPSED_WIDTH = 72

/** Altura comum: demandas, perfil, ver como, notificações (header). */
export const APP_SHELL_HEADER_CONTROL_HEIGHT = 40

/** Borda, fundo e raio padronizados para controles do header. */
export const appShellHeaderControlSx = {
  height: APP_SHELL_HEADER_CONTROL_HEIGHT,
  minHeight: APP_SHELL_HEADER_CONTROL_HEIGHT,
  boxSizing: 'border-box' as const,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
  '&:hover': {
    bgcolor: 'action.hover',
  },
}
