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
} from '@mui/material'
import type { ReactNode } from 'react'
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
}

export function OrgSummaryPanel({
  jobTitle,
  personName,
  selectedEntryId,
  summary,
  loading,
  headerActions,
}: Props) {
  const hasSelection = Boolean(personName && selectedEntryId)
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minHeight: 200,
        background: (t) =>
          t.palette.mode === 'dark'
            ? 'linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(15,23,42,0.95) 100%)'
            : 'linear-gradient(145deg, rgba(99,102,241,0.06) 0%, #fff 100%)',
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
          <TableContainer sx={{ maxHeight: 360, borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Cargo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Departamento</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Salário / mês
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Custo / mês
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Ordem
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.team.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
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
                      <TableCell sx={{ fontWeight: m.isSelectedRoot ? 600 : 400 }}>{m.personName}</TableCell>
                      <TableCell>{m.jobTitle?.trim() || '—'}</TableCell>
                      <TableCell>{m.departmentName ?? '—'}</TableCell>
                      <TableCell align="right">{brl(m.monthlySalary)}</TableCell>
                      <TableCell align="right">{brl(m.monthlyCost)}</TableCell>
                      <TableCell align="right">{m.displayOrder}</TableCell>
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
  )
}
