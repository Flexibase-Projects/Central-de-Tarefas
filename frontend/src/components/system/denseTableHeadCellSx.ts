import type { SxProps, Theme } from '@/compat/mui/material'

/** Cabeçalho de tabela densa (lista de execução): alto contraste, uppercase discreto. */
export const denseTableHeadCellSx: SxProps<Theme> = {
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  bgcolor: 'action.hover',
  py: 0.875,
  px: 1.125,
  whiteSpace: 'nowrap',
}

/** Células de corpo alinhadas ao cabeçalho denso (admin / listas compactas). */
export const denseTableBodyCellSx: SxProps<Theme> = {
  py: 0.625,
  px: 1.125,
  fontSize: '0.8125rem',
  lineHeight: 1.35,
}
