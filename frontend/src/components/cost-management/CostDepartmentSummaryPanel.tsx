import { Box, Chip, Divider, Typography } from '@/compat/mui/material'
import type { Theme } from '@/compat/mui/styles'
import type { CostItem, DepartmentMemberRow } from '@/types/cost-org'

type Props = {
  departmentName: string | null
  linkedCosts: CostItem[]
  members: DepartmentMemberRow[]
  /** Ao clicar num custo vinculado, abre edição */
  onCostClick?: (costId: string) => void
}

export function CostDepartmentSummaryPanel({ departmentName, linkedCosts, members, onCostClick }: Props) {
  const fixedTotal = linkedCosts.reduce((s, c) => s + (c.is_active !== false ? Number(c.amount) || 0 : 0), 0)
  const peopleTotal = members.reduce((s, m) => s + (Number(m.individual_monthly_cost) || 0), 0)

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minHeight: 220,
        background: (t: Theme) =>
          t.palette.mode === 'dark'
            ? 'linear-gradient(160deg, rgba(16,185,129,0.08) 0%, rgba(15,23,42,0.95) 100%)'
            : 'linear-gradient(160deg, rgba(16,185,129,0.06) 0%, #fff 100%)',
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Resumo do departamento
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.5, mb: 2 }}>
        {departmentName ?? 'Clique em um departamento na árvore'}
      </Typography>

      {departmentName ? (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Custos fixos (ativos)
              </Typography>
              <Typography variant="h6">
                {fixedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Custos com pessoas
              </Typography>
              <Typography variant="h6">
                {peopleTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Itens de custo vinculados ({linkedCosts.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {linkedCosts.length === 0 ? (
              <Typography variant="body2" color="text.disabled">
                Nenhum custo vinculado.
              </Typography>
            ) : (
              linkedCosts.map((c) => (
                <Chip
                  key={c.id}
                  size="small"
                  label={`${c.name} · ${(Number(c.amount) || 0).toLocaleString('pt-BR', { style: 'currency', currency: c.currency || 'BRL' })}`}
                  variant="outlined"
                  onClick={onCostClick ? () => onCostClick(c.id) : undefined}
                  sx={onCostClick ? { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } } : undefined}
                />
              ))
            )}
          </Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Pessoas ({members.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {members.map((m) => (
              <Typography key={m.id} variant="body2">
                {m.user?.name ?? m.user_id} —{' '}
                {(Number(m.individual_monthly_cost) || 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
                /mês
              </Typography>
            ))}
          </Box>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Selecione um nó de departamento para ver custos fixos, pessoas e totais conectados.
        </Typography>
      )}
    </Box>
  )
}
