import type React from 'react'
import type { SxProps, Theme } from '@/compat/mui/material'
import { IconButton } from '@/compat/mui/material'
import { mergeSx } from '@/compat/mui/sx'

export const APP_FLOATING_ACTION_Z_INDEX = 1200

export function appFloatingActionIconButtonFixedStyle(
  zIndex: number = APP_FLOATING_ACTION_Z_INDEX,
): React.CSSProperties {
  return {
    position: 'fixed',
    right: 'max(20px, env(safe-area-inset-right, 0px))',
    bottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
    zIndex,
  }
}

/** Estilo visual minimalista alinhado ao tema (uso com `IconButton` + `appFloatingActionIconButtonFixedStyle`). */
export function appFloatingActionIconButtonSx(theme: Theme): SxProps<Theme> {
  return {
    width: 44,
    height: 44,
    borderRadius: '999px',
    bgcolor: 'background.paper',
    color: 'primary.main',
    border: '1px solid',
    borderColor: 'divider',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 1px 2px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.04)'
        : '0 1px 3px rgba(15, 23, 42, 0.08)',
    transition: 'background-color 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
    '&:hover': {
      bgcolor: 'action.hover',
      color: 'primary.main',
      borderColor: 'primary.main',
      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 2px 8px rgba(0, 0, 0, 0.5)'
          : '0 4px 14px rgba(15, 23, 42, 0.12)',
    },
    '&:focus-visible': {
      outline: '2px solid hsl(var(--ring))',
      outlineOffset: 2,
    },
  }
}

export type AppFloatingActionIconButtonProps = Omit<
  React.ComponentProps<typeof IconButton>,
  'children' | 'sx' | 'style'
> & {
  children: React.ReactNode
  /** Mescla com o `sx` base do FAB flutuante */
  sx?: SxProps<Theme>
  style?: React.CSSProperties
  zIndex?: number
}

/**
 * Botão circular flutuante (canto inferior direito, safe-area),
 * visual consistente para “nova ação” em telas de execução.
 */
export function AppFloatingActionIconButton({
  children,
  sx: sxProp,
  style,
  size = 'medium',
  zIndex = APP_FLOATING_ACTION_Z_INDEX,
  ...rest
}: AppFloatingActionIconButtonProps) {
  return (
    <IconButton
      {...rest}
      size={size}
      style={{ ...appFloatingActionIconButtonFixedStyle(zIndex), ...style }}
      sx={(theme: Theme) => mergeSx(appFloatingActionIconButtonSx(theme), sxProp) as SxProps<Theme>}
    >
      {children}
    </IconButton>
  )
}
