import type { SxProps, Theme } from '@/compat/mui/material'

/** Container do campo de busca na faixa de filtros (lista/kanban). */
export const executionSearchFieldWrapperSx: SxProps<Theme> = {
  flex: { md: '1 1 240px' },
  minWidth: { xs: '100%', md: 200 },
  maxWidth: { md: 420 },
  width: { xs: '100%', md: 'auto' },
}

/**
 * Atividades (vários filtros): busca flex a partir de `md` (~900px).
 * Antes usava `xl`, só entrava em linha em viewport muito larga (efeito “tablet”).
 */
export const executionSearchFieldWrapperWideSx: SxProps<Theme> = {
  flex: { md: '1 1 200px' },
  minWidth: { xs: '100%', md: 180 },
  maxWidth: { md: 380 },
  width: { xs: '100%', md: 'auto' },
}

/**
 * Switch “só meus / só minhas”: label curto, empurra para a direita no desktop.
 * @param endBreakpoint onde aplicar `margin-left: auto` (alinha à direita da linha).
 */
export function compactScopeToggleLabelSx(endBreakpoint: 'md' | 'lg' | 'xl' = 'lg'): SxProps<Theme> {
  return {
    m: 0,
    ml: { xs: 0, [endBreakpoint]: 'auto' },
    gap: 0.5,
    flexShrink: 0,
    alignSelf: { xs: 'flex-start', [endBreakpoint]: 'center' },
    '& .MuiFormControlLabel-label': {
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.2,
      color: 'text.secondary',
      whiteSpace: 'nowrap',
    },
  }
}
