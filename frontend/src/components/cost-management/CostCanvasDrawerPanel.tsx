import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@/compat/mui/material'
import type { ReactNode } from 'react'
import type { Theme } from '@/compat/mui/styles'
import type { CostCanvasFocus, CostManagementGraph } from '@/types/cost-org'
import type { OrgEntry } from '@/hooks/use-org'

type Props = {
  focus: CostCanvasFocus | null
  graph: CostManagementGraph | null
  entryLabel: (e: OrgEntry) => string
  responsiblesForDept: (deptId: string) => OrgEntry[]
  headerActions?: ReactNode
  onEditCostFull: (costId: string) => void
  drawerDeptEditOpen: boolean
  onOpenDrawerDeptEdit: () => void
  onCancelDrawerDeptEdit: () => void
  drawerDeptName: string
  setDrawerDeptName: (v: string) => void
  drawerDeptDesc: string
  setDrawerDeptDesc: (v: string) => void
  drawerDeptErr: string | null
  drawerDeptSaving: boolean
  onSaveDrawerDept: () => void
  drawerMemberEditOpen: boolean
  onOpenDrawerMemberEdit: () => void
  onCancelDrawerMemberEdit: () => void
  drawerMemberCost: string
  setDrawerMemberCost: (v: string) => void
  drawerMemberErr: string | null
  drawerMemberSaving: boolean
  onSaveDrawerMember: () => void
  /** Rodapé fixo (ex.: exclusão com confirmação na página) */
  footerActions?: ReactNode
}

function money(n: number, currency = 'BRL') {
  return n.toLocaleString('pt-BR', { style: 'currency', currency })
}

const compactCellSx = {
  py: 0.55,
  px: 0.75,
  fontSize: '0.72rem',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

export function CostCanvasDrawerPanel({
  focus,
  graph,
  entryLabel,
  responsiblesForDept,
  headerActions,
  onEditCostFull,
  drawerDeptEditOpen,
  onOpenDrawerDeptEdit,
  onCancelDrawerDeptEdit,
  drawerDeptName,
  setDrawerDeptName,
  drawerDeptDesc,
  setDrawerDeptDesc,
  drawerDeptErr,
  drawerDeptSaving,
  onSaveDrawerDept,
  drawerMemberEditOpen,
  onOpenDrawerMemberEdit,
  onCancelDrawerMemberEdit,
  drawerMemberCost,
  setDrawerMemberCost,
  drawerMemberErr,
  drawerMemberSaving,
  onSaveDrawerMember,
  footerActions,
}: Props) {
  if (!graph || !focus) {
    return (
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          minHeight: 160,
          height: '100%',
          boxSizing: 'border-box',
          background: (t: Theme) =>
            t.palette.mode === 'dark'
              ? 'linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(15,23,42,0.95) 100%)'
              : 'linear-gradient(145deg, rgba(99,102,241,0.06) 0%, #fff 100%)',
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Detalhe do mapa
        </Typography>
        <Typography variant="h6" sx={{ mt: 1, fontWeight: 500 }}>
          Selecione um departamento, custo ou pessoa no mapa
        </Typography>
      </Box>
    )
  }

  if (focus.kind === 'department') {
    const dept = graph.departments.find((d) => d.id === focus.departmentId)
    const resp = responsiblesForDept(focus.departmentId)
    const costLinks = graph.departmentCosts.filter((l) => l.department_id === focus.departmentId)
    const costItems = costLinks
      .map((l) => graph.costItems.find((c) => c.id === l.cost_id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
    const mems = graph.members.filter((m) => m.department_id === focus.departmentId)

    return (
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          background: (t: Theme) =>
            t.palette.mode === 'dark'
              ? 'linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(15,23,42,0.95) 100%)'
              : 'linear-gradient(145deg, rgba(99,102,241,0.06) 0%, #fff 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
            Departamento
          </Typography>
          {headerActions}
        </Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5 }}>
          {dept?.name ?? '—'}
        </Typography>
        {dept?.description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {dept.description}
          </Typography>
        ) : null}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', mt: 1.5 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Responsáveis (organograma)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
            {resp.length === 0 ? (
              <Typography variant="body2" color="text.disabled">
                Nenhum — vincule em Gerenciar → Responsável no organograma
              </Typography>
            ) : (
              resp.map((e) => <Chip key={e.id} size="small" variant="outlined" label={entryLabel(e)} />)
            )}
          </Box>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Custos fixos vinculados ({costItems.length})
          </Typography>
          <TableContainer
            sx={{
              maxHeight: 200,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              mb: 2,
              overflowX: 'hidden',
              overflowY: 'auto',
            }}
          >
            <Table size="small" stickyHeader padding="none" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...compactCellSx, fontWeight: 700, width: '52%' }}>Custo</TableCell>
                  <TableCell sx={{ ...compactCellSx, fontWeight: 700, width: '28%' }} align="right">
                    Valor
                  </TableCell>
                  <TableCell sx={{ ...compactCellSx, fontWeight: 700, width: '20%' }} align="right">
                    Ação
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={compactCellSx}>
                      <Typography variant="body2" color="text.disabled">
                        Nenhum custo vinculado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  costItems.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell title={c.name} sx={compactCellSx}>
                        {c.name}
                      </TableCell>
                      <TableCell align="right" sx={compactCellSx}>
                        {money(Number(c.amount) || 0, c.currency || 'BRL')}
                      </TableCell>
                      <TableCell align="right" sx={compactCellSx}>
                        <Button size="small" onClick={() => onEditCostFull(c.id)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Pessoas com custo individual ({mems.length})
          </Typography>
          <TableContainer
            sx={{
              maxHeight: 200,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              mb: 2,
              overflowX: 'hidden',
              overflowY: 'auto',
            }}
          >
            <Table size="small" stickyHeader padding="none" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...compactCellSx, fontWeight: 700, width: '62%' }}>Nome</TableCell>
                  <TableCell sx={{ ...compactCellSx, fontWeight: 700, width: '38%' }} align="right">
                    Custo/mês
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} sx={compactCellSx}>
                      <Typography variant="body2" color="text.disabled">
                        Nenhuma pessoa cadastrada neste departamento
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  mems.map((m) => (
                    <TableRow key={`${m.department_id}-${m.user_id}`}>
                      <TableCell title={m.user?.name ?? m.user_id} sx={compactCellSx}>
                        {m.user?.name ?? m.user_id}
                      </TableCell>
                      <TableCell align="right" sx={compactCellSx}>
                        {money(Number(m.individual_monthly_cost) || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2 }} />
          {drawerDeptEditOpen ? (
            <>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Editar departamento
              </Typography>
              {drawerDeptErr ? (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {drawerDeptErr}
                </Alert>
              ) : null}
              <TextField
                label="Nome"
                size="small"
                fullWidth
                value={drawerDeptName}
                onChange={(e) => setDrawerDeptName(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <TextField
                label="Descrição"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={drawerDeptDesc}
                onChange={(e) => setDrawerDeptDesc(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" size="small" onClick={onSaveDrawerDept} disabled={drawerDeptSaving}>
                  Salvar
                </Button>
                <Button variant="outlined" size="small" onClick={onCancelDrawerDeptEdit} disabled={drawerDeptSaving}>
                  Cancelar
                </Button>
              </Box>
            </>
          ) : (
            <Button variant="outlined" size="small" onClick={onOpenDrawerDeptEdit}>
              Editar nome e descrição do departamento
            </Button>
          )}
        </Box>
        {footerActions ? (
          <Box
            sx={{
              mt: 2,
              pt: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}
          >
            {footerActions}
          </Box>
        ) : null}
      </Box>
    )
  }

  if (focus.kind === 'cost') {
    const c = graph.costItems.find((x) => x.id === focus.costId)
    const deptsForCost = graph.departmentCosts
      .filter((l) => l.cost_id === focus.costId)
      .map((l) => graph.departments.find((d) => d.id === l.department_id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d))

    return (
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          background: (t: Theme) =>
            t.palette.mode === 'dark'
              ? 'linear-gradient(145deg, rgba(168,85,247,0.1) 0%, rgba(15,23,42,0.95) 100%)'
              : 'linear-gradient(145deg, rgba(168,85,247,0.08) 0%, #fff 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="overline" color="text.secondary">
            Custo fixo
          </Typography>
          {headerActions}
        </Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5 }}>
          {c?.name ?? '—'}
        </Typography>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', mt: 0.5 }}>
          {c ? (
            <Typography variant="h6" color="primary" sx={{ mt: 0.5 }}>
              {money(Number(c.amount) || 0, c.currency || 'BRL')}
            </Typography>
          ) : null}
          {c ? (
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Chip size="small" label={c.status} variant="outlined" />
              <Chip size="small" label={c.category} variant="outlined" />
            </Box>
          ) : null}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Vinculado aos departamentos ({deptsForCost.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
            {deptsForCost.length === 0 ? (
              <Typography variant="body2" color="text.disabled">
                Ainda não vinculado — arraste no mapa até um departamento
              </Typography>
            ) : (
              deptsForCost.map((d) => <Chip key={d.id} size="small" variant="outlined" label={d.name} />)
            )}
          </Box>

          <Button variant="contained" size="small" onClick={() => onEditCostFull(focus.costId)} disabled={!c}>
            Abrir edição completa do custo
          </Button>
        </Box>
        {footerActions ? (
          <Box
            sx={{
              mt: 2,
              pt: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}
          >
            {footerActions}
          </Box>
        ) : null}
      </Box>
    )
  }

  /* member */
  const m = graph.members.find(
    (x) => x.department_id === focus.departmentId && x.user_id === focus.userId
  )
  const deptName = graph.departments.find((d) => d.id === focus.departmentId)?.name ?? '—'

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        background: (t: Theme) =>
          t.palette.mode === 'dark'
            ? 'linear-gradient(145deg, rgba(34,197,94,0.12) 0%, rgba(15,23,42,0.95) 100%)'
            : 'linear-gradient(145deg, rgba(34,197,94,0.08) 0%, #fff 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="overline" color="text.secondary">
          Pessoa no departamento
        </Typography>
        {headerActions}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5 }}>
          {m?.user?.name ?? m?.user_id ?? '—'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {m?.user?.email ?? ''}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Departamento: <strong>{deptName}</strong>
        </Typography>
        <Typography variant="h6" sx={{ mt: 1 }}>
          {money(Number(m?.individual_monthly_cost) || 0)}
          <Typography component="span" variant="caption" color="text.secondary">
            {' '}
            /mês
          </Typography>
        </Typography>

        <Divider sx={{ my: 2 }} />
        {drawerMemberEditOpen ? (
          <>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Editar custo mensal individual
            </Typography>
            {drawerMemberErr ? (
              <Alert severity="error" sx={{ mb: 1 }}>
                {drawerMemberErr}
              </Alert>
            ) : null}
            <TextField
              label="Custo mensal (R$)"
              size="small"
              fullWidth
              type="text"
              inputMode="decimal"
              value={drawerMemberCost}
              onChange={(e) => setDrawerMemberCost(e.target.value)}
              placeholder="Ex.: 4.200,00"
              sx={{ mb: 1.5 }}
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="contained" size="small" onClick={onSaveDrawerMember} disabled={drawerMemberSaving}>
                Salvar
              </Button>
              <Button variant="outlined" size="small" onClick={onCancelDrawerMemberEdit} disabled={drawerMemberSaving}>
                Cancelar
              </Button>
            </Box>
          </>
        ) : (
          <Button variant="outlined" size="small" onClick={onOpenDrawerMemberEdit}>
            Editar valor mensal
          </Button>
        )}
      </Box>
      {footerActions ? (
        <Box
          sx={{
            mt: 2,
            pt: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          {footerActions}
        </Box>
      ) : null}
    </Box>
  )
}
