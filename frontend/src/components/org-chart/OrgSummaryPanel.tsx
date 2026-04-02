import {
  Box,
  Divider,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Typography,
} from '@/compat/mui/material'
import type { ReactNode } from 'react'
import type { Theme } from '@/compat/mui/styles'
import type { OrgPersonSummary } from '@/types/cost-org'

const brl = (n: number | null) =>
  n == null
    ? '—'
    : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

type Props = {
  jobTitle: string | null
  personName: string | null
  selectedEntryId: string | null
  summary: OrgPersonSummary | null
  loading: boolean
  headerActions?: ReactNode
  footerActions?: ReactNode
}

export function OrgSummaryPanel({
  jobTitle,
  personName,
  selectedEntryId,
  summary,
  loading,
  headerActions,
  footerActions,
}: Props) {
  const hasSelection = Boolean(personName && selectedEntryId)
  const compactCellSx = {
    py: 0.55,
    px: 0.75,
    fontSize: '0.72rem',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as const

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minHeight: 200,
        background: (t: Theme) =>
          t.palette.mode === 'dark'
            ? 'linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(15,23,42,0.95) 100%)'
            : 'linear-gradient(145deg, rgba(99,102,241,0.06) 0%, #fff 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
          Resumo da subárvore
        </Typography>
        {headerActions ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{headerActions}</Box> : null}
      </Box>
      {hasSelection ? (
        <Box sx={{ mt: 0.5, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {jobTitle?.trim() || '—'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {personName}
          </Typography>
        </Box>
      ) : (
        <Typography variant="h6" sx={{ mt: 0.5, mb: 2, fontWeight: 500 }}>
          Selecione um cargo no organograma
        </Typography>
      )}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {loading ? (
          <Skeleton variant="rounded" height={160} />
        ) : summary ? (
          <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Totais
          </Typography>
          <TableContainer sx={{ mb: 2, borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <Table size="small" padding="none">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ pl: 1.5, py: 1, fontWeight: 500, borderBottom: 1, borderColor: 'divider' }}>
                    Pessoas (subárvore)
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                    {summary.headcount}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ pl: 1.5, py: 1, fontWeight: 500, borderBottom: 1, borderColor: 'divider' }}>
                    Total salários / mês
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                    {brl(summary.totalMonthlySalary)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ pl: 1.5, py: 1, fontWeight: 500 }}>Total custos / mês</TableCell>
                  <TableCell align="right" sx={{ pr: 1.5, py: 1 }}>
                    {brl(summary.totalMonthlyCost)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Equipe (hierarquia: raiz → filhos)
          </Typography>
          <TableContainer
            sx={{
              maxHeight: 230,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              overflowX: 'hidden',
              overflowY: 'auto',
            }}
          >
            <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...compactCellSx, fontWeight: 700, width: '24%' }}>Nome</TableCell>
                  <TableCell sx={{ ...compactCellSx, fontWeight: 700, width: '20%' }}>Cargo</TableCell>
                  <TableCell sx={{ ...compactCellSx, fontWeight: 700, width: '18%' }}>Depto</TableCell>
                  <TableCell align="right" sx={{ ...compactCellSx, fontWeight: 700, width: '15%' }}>Salário</TableCell>
                  <TableCell align="right" sx={{ ...compactCellSx, fontWeight: 700, width: '15%' }}>Custo</TableCell>
                  <TableCell align="right" sx={{ ...compactCellSx, fontWeight: 700, width: '8%' }}>Ord</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.team.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={compactCellSx}>
                      <Typography variant="body2" color="text.disabled">
                        Nenhuma pessoa nesta subárvore.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.team.map((m) => (
                    <TableRow
                      key={m.orgEntryId}
                      sx={{
                        bgcolor: m.isSelectedRoot ? 'action.selected' : undefined,
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell title={m.personName} sx={{ ...compactCellSx, fontWeight: m.isSelectedRoot ? 600 : 400 }}>
                        {m.personName}
                      </TableCell>
                      <TableCell title={m.jobTitle?.trim() || '—'} sx={compactCellSx}>
                        {m.jobTitle?.trim() || '—'}
                      </TableCell>
                      <TableCell title={m.departmentName ?? '—'} sx={compactCellSx}>
                        {m.departmentName ?? '—'}
                      </TableCell>
                      <TableCell align="right" sx={compactCellSx}>
                        {brl(m.monthlySalary)}
                      </TableCell>
                      <TableCell align="right" sx={compactCellSx}>
                        {brl(m.monthlyCost)}
                      </TableCell>
                      <TableCell align="right" sx={compactCellSx}>
                        {m.displayOrder}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Clique em um nó para ver totais e a equipe em tabela.
          </Typography>
        )}
      </Box>
      {footerActions ? (
        <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          {footerActions}
        </Box>
      ) : null}
    </Box>
  )
}
