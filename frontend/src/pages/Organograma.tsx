import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'
import { Plus, Trash2, Pencil, X } from 'lucide-react'
import { OrgChartIcon } from '@/components/ui/icons'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { OrgTreeFlow } from '@/components/org-chart/OrgTreeFlow'
import { OrgSummaryPanel } from '@/components/org-chart/OrgSummaryPanel'
import { useOrgTree, useOrgSummary, useOrgEntries } from '@/hooks/use-org'
import { useCostGraph } from '@/hooks/use-cost-graph'
import type { OrgTreeNode, Department } from '@/types/cost-org'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''
const MAIN_HEADER_PX = 59

function moneyFieldToNumber(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function moneyNumToField(v: number | string | null | undefined): string {
  if (v == null || v === '') return ''
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? String(n) : ''
}

function findNodeInTree(nodes: OrgTreeNode[], entryId: string): OrgTreeNode | null {
  for (const n of nodes) {
    if (n.orgEntryId === entryId) return n
    const c = findNodeInTree(n.children, entryId)
    if (c) return c
  }
  return null
}

export default function Organograma() {
  const { getAuthHeaders } = useAuth()
  const { tree, loading, error, fetchTree } = useOrgTree()
  const { summary, loading: sumLoading, fetchSummary, setSummary } = useOrgSummary()
  const { entries, fetchEntries, createEntry, deleteEntry, updateEntry } = useOrgEntries()
  const { graph, fetchGraph } = useCostGraph()

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formPersonName, setFormPersonName] = useState('')
  const [formReportsTo, setFormReportsTo] = useState<string>('')
  const [formJobTitle, setFormJobTitle] = useState('')
  const [formDepartmentId, setFormDepartmentId] = useState<string>('')
  const [formSalary, setFormSalary] = useState('')
  const [formCost, setFormCost] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editPersonName, setEditPersonName] = useState('')
  const [editReportsTo, setEditReportsTo] = useState<string>('')
  const [editJobTitle, setEditJobTitle] = useState('')
  const [editDepartmentId, setEditDepartmentId] = useState<string>('')
  const [editSalary, setEditSalary] = useState('')
  const [editCost, setEditCost] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    fetchTree()
    void fetchEntries()
    void fetchGraph()
  }, [fetchTree, fetchEntries, fetchGraph])

  const loadSubtree = useCallback(
    async (entryId: string) => {
      try {
        const url = API_URL
          ? `${API_URL}/api/org/entry/${entryId}/subtree`
          : `/api/org/entry/${entryId}/subtree`
        const res = await fetch(url, { headers: getAuthHeaders() })
        const j = (await res.json()) as { entryIds?: string[] }
        if (j.entryIds) setHighlightedIds(new Set(j.entryIds))
      } catch {
        setHighlightedIds(new Set([entryId]))
      }
    },
    [getAuthHeaders]
  )

  const onSelectEntry = useCallback(
    (entryId: string) => {
      setSelectedEntryId(entryId)
      setEditOpen(false)
      setEditError(null)
      setSummary(null)
      void loadSubtree(entryId)
      void fetchSummary(entryId)
    },
    [fetchSummary, loadSubtree, setSummary]
  )

  const closeDrawer = useCallback(() => {
    setSelectedEntryId(null)
    setSummary(null)
    setHighlightedIds(new Set())
    setEditOpen(false)
    setEditError(null)
  }, [setSummary])

  const selectedNode = useMemo(
    () => (selectedEntryId ? findNodeInTree(tree, selectedEntryId) : null),
    [tree, selectedEntryId]
  )

  const selectedEntryRow = useMemo(
    () => (selectedEntryId ? entries.find((e) => e.id === selectedEntryId) : undefined),
    [entries, selectedEntryId]
  )

  /** Não pode reportar a si nem a ninguém na própria subárvore (evita ciclo). */
  const forbiddenParentIds = useMemo(() => new Set(highlightedIds), [highlightedIds])

  const openEdit = useCallback(() => {
    if (!selectedEntryId || !selectedEntryRow) return
    setEditPersonName(selectedEntryRow.person_name)
    setEditJobTitle(selectedEntryRow.job_title ?? '')
    setEditReportsTo(selectedEntryRow.reports_to_id ?? '')
    setEditDepartmentId(selectedEntryRow.department_id ?? '')
    setEditSalary(moneyNumToField(selectedEntryRow.monthly_salary))
    setEditCost(moneyNumToField(selectedEntryRow.monthly_cost))
    setEditError(null)
    setEditOpen(true)
  }, [selectedEntryId, selectedEntryRow])

  const cancelEdit = useCallback(() => {
    setEditOpen(false)
    setEditError(null)
  }, [])

  const saveEdit = useCallback(async () => {
    if (!selectedEntryId) return
    const name = editPersonName.trim()
    if (!name) {
      setEditError('Informe o nome')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      await updateEntry(selectedEntryId, {
        person_name: name,
        job_title: editJobTitle.trim() || null,
        reports_to_id: editReportsTo || null,
        department_id: editDepartmentId || null,
        monthly_salary: moneyFieldToNumber(editSalary),
        monthly_cost: moneyFieldToNumber(editCost),
      })
      setEditOpen(false)
      await fetchTree()
      await fetchEntries()
      void loadSubtree(selectedEntryId)
      void fetchSummary(selectedEntryId)
    } catch (e) {
      setEditError((e as Error).message)
    } finally {
      setEditSaving(false)
    }
  }, [
    selectedEntryId,
    editPersonName,
    editJobTitle,
    editReportsTo,
    editDepartmentId,
    editSalary,
    editCost,
    updateEntry,
    fetchTree,
    fetchEntries,
    loadSubtree,
    fetchSummary,
  ])

  const openManage = () => {
    setDialogOpen(true)
    setFormError(null)
    void fetchEntries()
  }

  const handleCreate = async () => {
    const name = formPersonName.trim()
    if (!name) {
      setFormError('Informe o nome da pessoa')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await createEntry({
        person_name: name,
        reports_to_id: formReportsTo || null,
        job_title: formJobTitle.trim() || null,
        display_order: 0,
        department_id: formDepartmentId || null,
        monthly_salary: moneyFieldToNumber(formSalary),
        monthly_cost: moneyFieldToNumber(formCost),
      })
      setFormPersonName('')
      setFormReportsTo('')
      setFormJobTitle('')
      setFormDepartmentId('')
      setFormSalary('')
      setFormCost('')
      await fetchTree()
      await fetchEntries()
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteEntry(id)
      await fetchTree()
      await fetchEntries()
      if (selectedEntryId) {
        if (selectedEntryId === id) {
          closeDrawer()
        } else {
          void loadSubtree(selectedEntryId)
          void fetchSummary(selectedEntryId)
        }
      }
    } catch {
      /* toast optional */
    }
  }

  const entryLabel = (e: { person_name: string; job_title: string | null }) =>
    e.job_title?.trim() ? `${e.person_name} — ${e.job_title}` : e.person_name

  const drawerWidth = { xs: '100%', sm: 520 }
  const departments: Department[] = graph?.departments ?? []

  return (
    <ProtectedRoute role="admin">
      <Box
        sx={{
          height: `calc(100dvh - ${MAIN_HEADER_PX}px)`,
          maxHeight: `calc(100dvh - ${MAIN_HEADER_PX}px)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
          p: { xs: 2, md: 3 },
          pb: 2,
        }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <OrgChartIcon style={{ color: 'var(--mui-palette-secondary-main)', width: 32, height: 32 }} />
              <Typography variant="h5" component="h1" fontWeight={600}>
                Organograma da Empresa
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={openManage} sx={{ ml: { md: 'auto' } }}>
              Gerenciar organograma
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, maxWidth: 720 }}>
            Clique em outro nó a qualquer momento: o painel à direita só atualiza os dados, sem fechar o mapa. Use o X
            para fechar o painel.
          </Typography>

          {error?.includes('MIGRATION') || error?.includes('migração') || error?.includes('004') || error?.includes('005') ? (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              Migrações: <strong>004</strong> (hierarquia por nome) e <strong>005_org_person_salary_cost.sql</strong> (salário/custo) no
              Supabase, se ainda não aplicou.
            </Alert>
          ) : null}
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <OrgTreeFlow
            tree={tree}
            loading={loading}
            error={error}
            highlightedIds={highlightedIds}
            onSelectEntry={onSelectEntry}
            fillHeight
          />
        </Box>

        <Drawer
          anchor="right"
          open={Boolean(selectedEntryId)}
          onClose={closeDrawer}
          hideBackdrop
          sx={{
            pointerEvents: 'none',
            '& .MuiDrawer-paper': { pointerEvents: 'auto' },
          }}
          PaperProps={{
            sx: {
              width: drawerWidth,
              maxWidth: '100vw',
              boxSizing: 'border-box',
              borderLeft: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: (t) => t.shadows[12],
            },
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, height: '100%', overflow: 'auto' }}>
            <OrgSummaryPanel
              jobTitle={selectedNode?.jobTitle ?? null}
              personName={selectedNode?.personName ?? null}
              selectedEntryId={selectedEntryId}
              summary={summary}
              loading={sumLoading}
              headerActions={
                <>
                  <Tooltip title="Editar pessoa selecionada">
                    <span>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={openEdit}
                        disabled={!selectedEntryRow}
                        aria-label="Editar"
                      >
                        <Pencil size={18} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Fechar painel">
                    <IconButton size="small" onClick={closeDrawer} aria-label="Fechar">
                      <X size={18} />
                    </IconButton>
                  </Tooltip>
                </>
              }
            />

          </Box>
        </Drawer>

        <Dialog open={editOpen} onClose={cancelEdit} maxWidth="sm" fullWidth>
          <DialogTitle>Editar cadastro</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
            {editError ? (
              <Alert severity="error" onClose={() => setEditError(null)}>
                {editError}
              </Alert>
            ) : null}
            <TextField
              label="Nome"
              size="small"
              fullWidth
              value={editPersonName}
              onChange={(e) => setEditPersonName(e.target.value)}
            />
            <TextField
              label="Função / cargo"
              size="small"
              fullWidth
              value={editJobTitle}
              onChange={(e) => setEditJobTitle(e.target.value)}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Reporta-se a</InputLabel>
              <Select
                value={editReportsTo}
                label="Reporta-se a"
                onChange={(e) => setEditReportsTo(e.target.value as string)}
              >
                <MenuItem value="">— Raiz —</MenuItem>
                {entries
                  .filter((e) => !forbiddenParentIds.has(e.id))
                  .map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {entryLabel(e)}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Departamento (opcional)</InputLabel>
              <Select
                value={editDepartmentId}
                label="Departamento (opcional)"
                onChange={(e) => setEditDepartmentId(e.target.value as string)}
              >
                <MenuItem value="">— Nenhum —</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Salário mensal (R$)"
              size="small"
              fullWidth
              value={editSalary}
              onChange={(e) => setEditSalary(e.target.value)}
              placeholder="Ex.: 5000 ou 5000,50"
                  inputMode="decimal"
            />
            <TextField
              label="Custo mensal (R$)"
              size="small"
              fullWidth
              value={editCost}
              onChange={(e) => setEditCost(e.target.value)}
              placeholder="Ex.: 1200"
                  inputMode="decimal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelEdit} disabled={editSaving}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={() => void saveEdit()} disabled={editSaving}>
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Gerenciar organograma</DialogTitle>
          <DialogContent>
            {formError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            ) : null}
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
              Adicionar pessoa
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <TextField
                label="Nome"
                size="small"
                fullWidth
                required
                value={formPersonName}
                onChange={(e) => setFormPersonName(e.target.value)}
                placeholder="Nome como aparece no organograma"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Reporta-se a (opcional)</InputLabel>
                <Select
                  value={formReportsTo}
                  label="Reporta-se a (opcional)"
                  onChange={(e) => setFormReportsTo(e.target.value as string)}
                >
                  <MenuItem value="">— Raiz —</MenuItem>
                  {entries.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {entryLabel(e)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Função / cargo"
                size="small"
                fullWidth
                value={formJobTitle}
                onChange={(e) => setFormJobTitle(e.target.value)}
                helperText="Aparece em destaque no mapa; o nome fica na linha de baixo."
              />
              <FormControl fullWidth size="small">
                <InputLabel>Departamento (opcional)</InputLabel>
                <Select
                  value={formDepartmentId}
                  label="Departamento (opcional)"
                  onChange={(e) => setFormDepartmentId(e.target.value as string)}
                >
                  <MenuItem value="">— Nenhum —</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Salário mensal (R$)"
                size="small"
                fullWidth
                value={formSalary}
                onChange={(e) => setFormSalary(e.target.value)}
                placeholder="Ex.: 5.000,00"
                inputMode="decimal"
              />
              <TextField
                label="Custo mensal (R$)"
                size="small"
                fullWidth
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
                placeholder="Ex.: 1.200,00"
                inputMode="decimal"
              />
              <Button variant="outlined" onClick={handleCreate} disabled={saving}>
                Adicionar
              </Button>
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              Cadastrados
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cargo</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>Departamento</TableCell>
                  <TableCell align="right">Salário/mês</TableCell>
                  <TableCell align="right">Custo/mês</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{e.job_title?.trim() || '—'}</TableCell>
                    <TableCell>{e.person_name}</TableCell>
                    <TableCell>
                      {departments.find((d) => d.id === e.department_id)?.name ?? '—'}
                    </TableCell>
                    <TableCell align="right">
                      {e.monthly_salary != null
                        ? Number(e.monthly_salary).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {e.monthly_cost != null
                        ? Number(e.monthly_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Remover do organograma">
                        <IconButton size="small" color="error" onClick={() => void handleDeleteEntry(e.id)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ProtectedRoute>
  )
}
