import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Drawer,
} from '@/compat/mui/material'
import type { Theme } from '@/compat/mui/styles'
import { Plus, RefreshCw, Link2, UserPlus, Building2, UserCircle, Pencil, X, Trash2 } from 'lucide-react'
import {
  CostTreeFlow,
  type CanvasDialogAction,
  type CanvasDialogContext,
  type PendingNodePlacement,
} from '@/components/cost-management/CostTreeFlow'
import { useCostGraph } from '@/hooks/use-cost-graph'
import { useAuth } from '@/contexts/AuthContext'
import { useUsersList } from '@/hooks/use-users-list'
import { useOrgEntries, type OrgEntry } from '@/hooks/use-org'
import type { CostCanvasFocus } from '@/types/cost-org'
import { CostCanvasDrawerPanel } from '@/components/cost-management/CostCanvasDrawerPanel'
import AppSurface from '@/components/system/AppSurface'
import SectionHeader from '@/components/system/SectionHeader'
import StatusToken from '@/components/system/StatusToken'
import { apiUrl } from '@/lib/api'
const MAIN_HEADER_PX = 59
const DRAWER_WIDTH = { xs: '100%', sm: 420 } as const

type CostDeletePreviewRow = { key: string; title: string; subtitle?: string }

function brlFieldToNumber(raw: string): number {
  const normalized = raw.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function numberToBrlField(value: number | string | null | undefined): string {
  if (value == null || value === '') return ''
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return ''
  return String(parsed).replace('.', ',')
}

export default function CustosDepartamento() {
  const { getAuthHeaders, currentWorkspace } = useAuth()
  const { graph, loading, error, fetchGraph } = useCostGraph()
  const { users, refreshUsers } = useUsersList()
  const { entries: orgEntries, fetchEntries, updateEntry } = useOrgEntries()

  const [canvasFocus, setCanvasFocus] = useState<CostCanvasFocus | null>(null)

  const [drawerDeptEditOpen, setDrawerDeptEditOpen] = useState(false)
  const [drawerDeptName, setDrawerDeptName] = useState('')
  const [drawerDeptDesc, setDrawerDeptDesc] = useState('')
  const [drawerDeptErr, setDrawerDeptErr] = useState<string | null>(null)
  const [drawerDeptSaving, setDrawerDeptSaving] = useState(false)

  const [drawerMemberEditOpen, setDrawerMemberEditOpen] = useState(false)
  const [drawerMemberCost, setDrawerMemberCost] = useState('0')
  const [drawerMemberErr, setDrawerMemberErr] = useState<string | null>(null)
  const [drawerMemberSaving, setDrawerMemberSaving] = useState(false)

  const [deptDialog, setDeptDialog] = useState(false)
  const [deptName, setDeptName] = useState('')
  const [deptDesc, setDeptDesc] = useState('')

  const [costDialog, setCostDialog] = useState(false)
  const [costName, setCostName] = useState('')
  const [costAmount, setCostAmount] = useState('0')
  const [costCategory, setCostCategory] = useState('ferramenta')

  const [linkDialog, setLinkDialog] = useState(false)
  const [linkDeptId, setLinkDeptId] = useState('')
  const [linkCostId, setLinkCostId] = useState('')

  const [memberDialog, setMemberDialog] = useState(false)
  const [memDeptId, setMemDeptId] = useState('')
  const [memUserId, setMemUserId] = useState('')
  const [memCost, setMemCost] = useState('0')

  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignDeptId, setAssignDeptId] = useState('')
  const [assignEntryId, setAssignEntryId] = useState('')
  /** Opcional: ao criar departamento, já vincula esta entrada do organograma como responsável */
  const [deptOrgEntryId, setDeptOrgEntryId] = useState('')

  const [formErr, setFormErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [editCostOpen, setEditCostOpen] = useState(false)
  const [editCostId, setEditCostId] = useState<string | null>(null)
  const [editCostErr, setEditCostErr] = useState<string | null>(null)
  const [ecName, setEcName] = useState('')
  const [ecDescription, setEcDescription] = useState('')
  const [ecAmount, setEcAmount] = useState('0')
  const [ecCurrency, setEcCurrency] = useState('BRL')
  const [ecStatus, setEcStatus] = useState('analise')
  const [ecCategory, setEcCategory] = useState('outro')
  const [ecIsActive, setEcIsActive] = useState(true)
  const [ecActivities, setEcActivities] = useState('')
  const [ecResultDesc, setEcResultDesc] = useState('')
  const [ecResultAmount, setEcResultAmount] = useState('')

  /** Posição no fluxo para spawn após POST (botão direito no canvas) */
  const canvasSpawnRef = useRef<{ x: number; y: number } | null>(null)
  const [pendingNodePlacement, setPendingNodePlacement] = useState<PendingNodePlacement | null>(null)

  const [costDeletePreviewOpen, setCostDeletePreviewOpen] = useState(false)
  const [costDeleteConfirmOpen, setCostDeleteConfirmOpen] = useState(false)
  const [costDeleteBusy, setCostDeleteBusy] = useState(false)
  const [costDeleteError, setCostDeleteError] = useState<string | null>(null)

  useEffect(() => {
    void fetchGraph()
    void fetchEntries()
  }, [fetchGraph, fetchEntries])

  const entryLabel = (e: { person_name: string; job_title: string | null }) =>
    e.job_title?.trim() ? `${e.person_name} — ${e.job_title}` : e.person_name

  const responsiblesForDept = (deptId: string) =>
    orgEntries.filter((e: OrgEntry) => e.department_id === deptId)

  const openManageDialog = () => {
    setFormErr(null)
    setManageDialogOpen(true)
    void fetchEntries()
  }

  const postJson = useCallback(
    async (path: string, body: unknown) => {
      const res = await fetch(apiUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || res.statusText)
      }
      return res.json()
    },
    [getAuthHeaders]
  )

  const patchJson = useCallback(
    async (path: string, body: unknown) => {
      const res = await fetch(apiUrl(path), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || res.statusText)
      }
      return res.json()
    },
    [getAuthHeaders]
  )

  const deleteJson = useCallback(
    async (path: string) => {
      const res = await fetch(apiUrl(path), { method: 'DELETE', headers: getAuthHeaders() })
      if (!res.ok && res.status !== 204) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || res.statusText)
      }
    },
    [getAuthHeaders]
  )

  const closeCostDrawer = useCallback(() => {
    setCanvasFocus(null)
    setDrawerDeptEditOpen(false)
    setDrawerMemberEditOpen(false)
    setDrawerDeptErr(null)
    setDrawerMemberErr(null)
    setCostDeletePreviewOpen(false)
    setCostDeleteConfirmOpen(false)
    setCostDeleteError(null)
  }, [])

  const costDeletePreviewRows = useMemo((): CostDeletePreviewRow[] => {
    if (!graph || !canvasFocus) return []
    if (canvasFocus.kind === 'department') {
      const d = graph.departments.find((x) => x.id === canvasFocus.departmentId)
      const name = d?.name ?? 'Departamento'
      const rows: CostDeletePreviewRow[] = [
        { key: 'dept', title: name, subtitle: 'Exclusão do departamento (centro de custo)' },
      ]
      const mems = graph.members.filter((m) => m.department_id === canvasFocus.departmentId)
      for (const m of mems) {
        rows.push({
          key: `mem-${m.user_id}`,
          title: m.user?.name ?? m.user_id,
          subtitle: 'Remoção da pessoa neste departamento',
        })
      }
      const links = graph.departmentCosts.filter((l) => l.department_id === canvasFocus.departmentId)
      for (const l of links) {
        const c = graph.costItems.find((ci) => ci.id === l.cost_id)
        rows.push({
          key: `link-${l.cost_id}`,
          title: c?.name ?? 'Custo fixo',
          subtitle: 'Desvinculação — o cadastro do custo permanece no sistema',
        })
      }
      return rows
    }
    if (canvasFocus.kind === 'cost') {
      const c = graph.costItems.find((x) => x.id === canvasFocus.costId)
      const depts = graph.departmentCosts
        .filter((l) => l.cost_id === canvasFocus.costId)
        .map((l) => graph.departments.find((dep) => dep.id === l.department_id))
        .filter((dep): dep is NonNullable<typeof dep> => Boolean(dep))
      const rows: CostDeletePreviewRow[] = [
        {
          key: 'cost',
          title: c?.name ?? 'Custo fixo',
          subtitle: 'Exclusão definitiva do item e de todos os vínculos',
        },
      ]
      for (const dep of depts) {
        rows.push({
          key: `dept-${dep.id}`,
          title: dep.name,
          subtitle: 'Vínculo com este departamento será removido',
        })
      }
      return rows
    }
    const m = graph.members.find(
      (x) => x.department_id === canvasFocus.departmentId && x.user_id === canvasFocus.userId
    )
    const dn = graph.departments.find((dep) => dep.id === canvasFocus.departmentId)?.name ?? 'Departamento'
    return [
      {
        key: 'mem',
        title: m?.user?.name ?? m?.user_id ?? 'Pessoa',
        subtitle: `Remoção do vínculo com ${dn}`,
      },
    ]
  }, [graph, canvasFocus])

  const costDeleteButtonLabel =
    canvasFocus?.kind === 'department'
      ? 'Excluir item/subárvore'
      : canvasFocus?.kind === 'cost'
        ? 'Excluir custo fixo'
        : 'Remover pessoa do departamento'

  const openCostDeletePreview = () => {
    setCostDeleteError(null)
    setCostDeletePreviewOpen(true)
  }

  const closeCostDeleteFlow = () => {
    setCostDeletePreviewOpen(false)
    setCostDeleteConfirmOpen(false)
    setCostDeleteError(null)
  }

  const goToCostDeleteFinalConfirm = () => {
    setCostDeletePreviewOpen(false)
    setCostDeleteConfirmOpen(true)
  }

  const confirmCostDelete = async () => {
    if (!canvasFocus) return
    setCostDeleteBusy(true)
    setCostDeleteError(null)
    try {
      if (canvasFocus.kind === 'department') {
        await deleteJson(`/api/departments/${canvasFocus.departmentId}`)
      } else if (canvasFocus.kind === 'cost') {
        await deleteJson(`/api/cost-items/${canvasFocus.costId}`)
      } else {
        await deleteJson(`/api/departments/${canvasFocus.departmentId}/members/${canvasFocus.userId}`)
      }
      closeCostDeleteFlow()
      closeCostDrawer()
      await fetchGraph()
    } catch (e) {
      setCostDeleteError((e as Error).message)
    } finally {
      setCostDeleteBusy(false)
    }
  }

  useEffect(() => {
    if (canvasFocus?.kind === 'department') {
      const d = graph?.departments.find((x) => x.id === canvasFocus.departmentId)
      if (d) {
        setDrawerDeptName(d.name)
        setDrawerDeptDesc(d.description ?? '')
      }
      setDrawerDeptEditOpen(false)
      setDrawerDeptErr(null)
    }
  }, [canvasFocus, graph?.departments])

  useEffect(() => {
    if (canvasFocus?.kind === 'member') {
      const m = graph?.members.find(
        (x) => x.department_id === canvasFocus.departmentId && x.user_id === canvasFocus.userId
      )
      if (m) setDrawerMemberCost(numberToBrlField(Number(m.individual_monthly_cost) || 0))
      setDrawerMemberEditOpen(false)
      setDrawerMemberErr(null)
    }
  }, [canvasFocus, graph?.members])

  const saveDrawerDepartment = useCallback(async () => {
    if (canvasFocus?.kind !== 'department') return
    const name = drawerDeptName.trim()
    if (!name) {
      setDrawerDeptErr('Informe o nome')
      return
    }
    setDrawerDeptSaving(true)
    setDrawerDeptErr(null)
    try {
      await patchJson(`/api/departments/${canvasFocus.departmentId}`, {
        name,
        description: drawerDeptDesc.trim() || null,
      })
      setDrawerDeptEditOpen(false)
      await fetchGraph()
    } catch (e) {
      setDrawerDeptErr((e as Error).message)
    } finally {
      setDrawerDeptSaving(false)
    }
  }, [canvasFocus, drawerDeptName, drawerDeptDesc, patchJson, fetchGraph])

  const saveDrawerMember = useCallback(async () => {
    if (canvasFocus?.kind !== 'member') return
    setDrawerMemberSaving(true)
    setDrawerMemberErr(null)
    try {
      await patchJson(`/api/departments/${canvasFocus.departmentId}/members/${canvasFocus.userId}`, {
        individual_monthly_cost: brlFieldToNumber(drawerMemberCost),
      })
      setDrawerMemberEditOpen(false)
      await fetchGraph()
    } catch (e) {
      setDrawerMemberErr((e as Error).message)
    } finally {
      setDrawerMemberSaving(false)
    }
  }, [canvasFocus, drawerMemberCost, patchJson, fetchGraph])

  const openEditCost = useCallback(
    (id: string) => {
      const c = graph?.costItems.find((x) => x.id === id)
      if (!c) return
      setEditCostId(id)
      setEcName(c.name)
      setEcDescription(c.description ?? '')
      setEcAmount(numberToBrlField(Number(c.amount) || 0))
      setEcCurrency(c.currency || 'BRL')
      setEcStatus(c.status)
      setEcCategory(c.category)
      setEcIsActive(c.is_active !== false)
      setEcActivities(c.activities_description ?? '')
      setEcResultDesc(c.result_savings_description ?? '')
      setEcResultAmount(c.result_savings_amount != null ? numberToBrlField(c.result_savings_amount) : '')
      setEditCostErr(null)
      setEditCostOpen(true)
    },
    [graph]
  )

  const handleSaveEditCost = async () => {
    if (!editCostId) return
    if (!ecName.trim()) {
      setEditCostErr('Informe o nome')
      return
    }
    setSaving(true)
    setEditCostErr(null)
    try {
      await patchJson(`/api/cost-items/${editCostId}`, {
        name: ecName.trim(),
        description: ecDescription.trim() || null,
        amount: brlFieldToNumber(ecAmount),
        currency: ecCurrency,
        status: ecStatus,
        category: ecCategory,
        is_active: ecIsActive,
        activities_description: ecActivities.trim() || null,
        result_savings_description: ecResultDesc.trim() || null,
        result_savings_amount: ecResultAmount.trim() === '' ? null : brlFieldToNumber(ecResultAmount),
      })
      setEditCostOpen(false)
      setEditCostId(null)
      await fetchGraph()
    } catch (e) {
      setEditCostErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateDept = async () => {
    if (!deptName.trim()) {
      setFormErr('Informe o nome')
      return
    }
    setSaving(true)
    setFormErr(null)
    try {
      const created = (await postJson('/api/departments', {
        name: deptName.trim(),
        description: deptDesc.trim() || null,
      })) as { id: string }
      if (deptOrgEntryId && created?.id) {
        await updateEntry(deptOrgEntryId, { department_id: created.id })
        await fetchEntries()
      }
      setDeptDialog(false)
      setDeptName('')
      setDeptDesc('')
      setDeptOrgEntryId('')
      await fetchGraph()
      const spawn = canvasSpawnRef.current
      canvasSpawnRef.current = null
      if (spawn && created?.id) {
        setPendingNodePlacement({ nodeId: `dept-${created.id}`, x: spawn.x, y: spawn.y })
      }
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCost = async () => {
    if (!costName.trim()) {
      setFormErr('Informe o nome do custo')
      return
    }
    setSaving(true)
    setFormErr(null)
    try {
      const created = (await postJson('/api/cost-items', {
        name: costName.trim(),
        amount: brlFieldToNumber(costAmount),
        category: costCategory,
        status: 'analise',
        is_active: true,
      })) as { id: string }
      setCostDialog(false)
      setCostName('')
      setCostAmount('')
      await fetchGraph()
      const spawn = canvasSpawnRef.current
      canvasSpawnRef.current = null
      if (spawn && created?.id) {
        setPendingNodePlacement({ nodeId: `cost-${created.id}`, x: spawn.x, y: spawn.y })
      }
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleLink = async () => {
    if (!linkDeptId || !linkCostId) {
      setFormErr('Selecione departamento e custo')
      return
    }
    setSaving(true)
    setFormErr(null)
    try {
      await postJson(`/api/departments/${linkDeptId}/costs`, { cost_id: linkCostId })
      setLinkDialog(false)
      await fetchGraph()
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleMember = async () => {
    if (!memDeptId || !memUserId) {
      setFormErr('Preencha departamento e usuário')
      return
    }
    setSaving(true)
    setFormErr(null)
    try {
      await postJson(`/api/departments/${memDeptId}/members`, {
        user_id: memUserId,
        individual_monthly_cost: brlFieldToNumber(memCost),
      })
      setMemberDialog(false)
      await fetchGraph()
      void refreshUsers()
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const openLink = () => {
    setLinkDialog(true)
    setFormErr(null)
    if (graph?.departments[0]) setLinkDeptId(graph.departments[0].id)
    if (graph?.costItems[0]) setLinkCostId(graph.costItems[0].id)
  }

  const openMember = () => {
    setMemberDialog(true)
    setFormErr(null)
    void refreshUsers()
    if (graph?.departments[0]) setMemDeptId(graph.departments[0].id)
  }

  const handleLinkCostToDepartment = useCallback(
    async (departmentId: string, costId: string) => {
      await postJson(`/api/departments/${departmentId}/costs`, { cost_id: costId })
      await fetchGraph()
    },
    [postJson, fetchGraph]
  )

  const handleUnlinkCostFromDepartment = useCallback(
    async (departmentId: string, costId: string) => {
      await deleteJson(`/api/departments/${departmentId}/costs/${costId}`)
      await fetchGraph()
    },
    [deleteJson, fetchGraph]
  )

  const handleOpenCanvasDialog = useCallback(
    (action: CanvasDialogAction, ctx?: CanvasDialogContext) => {
      setFormErr(null)
      const depts = graph?.departments ?? []
      const costs = graph?.costItems ?? []
      const hasFlow = ctx?.flowX != null && ctx?.flowY != null
      if (action === 'dept') {
        canvasSpawnRef.current = hasFlow ? { x: ctx!.flowX!, y: ctx!.flowY! } : null
        setDeptDialog(true)
        return
      }
      if (action === 'cost') {
        canvasSpawnRef.current = hasFlow ? { x: ctx!.flowX!, y: ctx!.flowY! } : null
        setCostDialog(true)
        return
      }
      canvasSpawnRef.current = null
      if (action === 'link') {
        setLinkDialog(true)
        if (ctx?.departmentId) setLinkDeptId(ctx.departmentId)
        else if (depts[0]) setLinkDeptId(depts[0].id)
        if (ctx?.costId) setLinkCostId(ctx.costId)
        else if (costs[0]) setLinkCostId(costs[0].id)
        return
      }
      if (action === 'member') {
        setMemberDialog(true)
        void refreshUsers()
        if (ctx?.departmentId) setMemDeptId(ctx.departmentId)
        else if (depts[0]) setMemDeptId(depts[0].id)
        return
      }
      if (action === 'assignResponsible') {
        setManageDialogOpen(false)
        setAssignDialogOpen(true)
        setFormErr(null)
        if (ctx?.departmentId) setAssignDeptId(ctx.departmentId)
        else if (depts[0]) setAssignDeptId(depts[0].id)
        setAssignEntryId('')
        void fetchEntries()
      }
    },
    [graph?.departments, graph?.costItems, refreshUsers, fetchEntries]
  )

  const handleSaveAssignResponsible = async () => {
    if (!assignDeptId || !assignEntryId) {
      setFormErr('Selecione departamento e pessoa do organograma')
      return
    }
    setSaving(true)
    setFormErr(null)
    try {
      await updateEntry(assignEntryId, { department_id: assignDeptId })
      await fetchEntries()
      setAssignEntryId('')
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleUnlinkOrgResponsible = async (entryId: string) => {
    setSaving(true)
    setFormErr(null)
    try {
      await updateEntry(entryId, { department_id: null })
      await fetchEntries()
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const refreshCostGraph = useCallback(async () => {
    await fetchGraph()
  }, [fetchGraph])

  const consumePendingCanvasNode = useCallback(() => setPendingNodePlacement(null), [])

  return (
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
        <AppSurface surface="subtle" sx={{ flexShrink: 0 }}>
          <SectionHeader
            title="Custos do Departamento"
            description="Canvas financeiro com foco em centros de custo, vínculos e responsáveis do organograma, sempre com inspector lateral para edição contextual."
            actions={
              <Button variant="contained" startIcon={<Plus size={18} />} onClick={openManageDialog}>
                Gerenciar custos
              </Button>
            }
            sx={{ pb: 1.25 }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
            <StatusToken tone="info">Canvas + inspector</StatusToken>
            <StatusToken tone="neutral">Clique para editar contexto</StatusToken>
            <StatusToken tone="success">Ações rápidas no botão direito</StatusToken>
          </Box>

          {error?.includes('MIGRATION') || error?.includes('migração') ? (
            <Alert severity="warning" sx={{ mb: 0.5 }}>
              Execute <strong>backend/migrations/003_cost_management.sql</strong> no Supabase.
            </Alert>
          ) : null}
        </AppSurface>

        <AppSurface surface="raised" sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.25 }}>
          <CostTreeFlow
            graph={graph}
            loading={loading}
            error={error}
            workspaceSlug={currentWorkspace?.slug ?? null}
            canvasFocus={canvasFocus}
            onCanvasFocusChange={setCanvasFocus}
            onLinkCostToDepartment={handleLinkCostToDepartment}
            onUnlinkCostFromDepartment={handleUnlinkCostFromDepartment}
            onRefreshGraph={refreshCostGraph}
            onOpenCanvasDialog={handleOpenCanvasDialog}
            pendingNodePlacement={pendingNodePlacement}
            onConsumedPendingNodePlacement={consumePendingCanvasNode}
            orgEntries={orgEntries}
            fillHeight
          />
        </AppSurface>

        <Drawer
          anchor="right"
          open={Boolean(canvasFocus)}
          onClose={closeCostDrawer}
          hideBackdrop
          sx={{
            pointerEvents: 'none',
            '& .MuiDrawer-paper': { pointerEvents: 'auto' },
          }}
          PaperProps={{
            sx: {
              width: DRAWER_WIDTH,
              maxWidth: '100vw',
              boxSizing: 'border-box',
              borderLeft: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: (t: Theme) => t.shadows[12],
            },
          }}
        >
          <Box
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <CostCanvasDrawerPanel
              focus={canvasFocus}
              graph={graph}
              entryLabel={entryLabel}
              responsiblesForDept={responsiblesForDept}
              headerActions={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {canvasFocus?.kind === 'department' ? (
                    <Tooltip title="Editar departamento">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          setDrawerDeptEditOpen(true)
                          setDrawerMemberEditOpen(false)
                        }}
                        aria-label="Editar departamento"
                      >
                        <Pencil size={18} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {canvasFocus?.kind === 'cost' ? (
                    <Tooltip title="Abrir edição completa do custo">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => openEditCost(canvasFocus.costId)}
                        aria-label="Editar custo"
                      >
                        <Pencil size={18} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {canvasFocus?.kind === 'member' ? (
                    <Tooltip title="Editar custo mensal">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => setDrawerMemberEditOpen(true)}
                        aria-label="Editar pessoa"
                      >
                        <Pencil size={18} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  <Tooltip title="Fechar painel">
                    <IconButton size="small" onClick={closeCostDrawer} aria-label="Fechar">
                      <X size={18} />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
              onEditCostFull={openEditCost}
              drawerDeptEditOpen={drawerDeptEditOpen}
              onOpenDrawerDeptEdit={() => setDrawerDeptEditOpen(true)}
              onCancelDrawerDeptEdit={() => setDrawerDeptEditOpen(false)}
              drawerDeptName={drawerDeptName}
              setDrawerDeptName={setDrawerDeptName}
              drawerDeptDesc={drawerDeptDesc}
              setDrawerDeptDesc={setDrawerDeptDesc}
              drawerDeptErr={drawerDeptErr}
              drawerDeptSaving={drawerDeptSaving}
              onSaveDrawerDept={() => void saveDrawerDepartment()}
              drawerMemberEditOpen={drawerMemberEditOpen}
              onOpenDrawerMemberEdit={() => setDrawerMemberEditOpen(true)}
              onCancelDrawerMemberEdit={() => setDrawerMemberEditOpen(false)}
              drawerMemberCost={drawerMemberCost}
              setDrawerMemberCost={setDrawerMemberCost}
              drawerMemberErr={drawerMemberErr}
              drawerMemberSaving={drawerMemberSaving}
              onSaveDrawerMember={() => void saveDrawerMember()}
              footerActions={
                canvasFocus ? (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Trash2 size={16} />}
                    onClick={openCostDeletePreview}
                    disabled={costDeleteBusy}
                  >
                    {costDeleteButtonLabel}
                  </Button>
                ) : null
              }
            />
            </Box>
          </Box>
        </Drawer>

        <Dialog
          open={costDeletePreviewOpen}
          onClose={costDeleteBusy ? undefined : closeCostDeleteFlow}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Prévia da exclusão</DialogTitle>
          <DialogContent sx={{ pt: 1.5 }}>
            {costDeleteError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {costDeleteError}
              </Alert>
            ) : null}
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Confira o que será alterado (<strong>{costDeletePreviewRows.length}</strong> linha(s)).
            </Typography>
            <Box sx={{ maxHeight: 260, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
              {costDeletePreviewRows.map((row) => (
                <Box
                  key={row.key}
                  sx={{
                    py: 0.5,
                    px: 0.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {row.title}
                  </Typography>
                  {row.subtitle ? (
                    <Typography variant="caption" color="text.secondary" component="div">
                      {row.subtitle}
                    </Typography>
                  ) : null}
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCostDeleteFlow} disabled={costDeleteBusy}>
              Cancelar
            </Button>
            <Button color="error" variant="contained" onClick={goToCostDeleteFinalConfirm} disabled={costDeleteBusy}>
              Continuar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={costDeleteConfirmOpen}
          onClose={costDeleteBusy ? undefined : closeCostDeleteFlow}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogContent sx={{ pt: 1.5 }}>
            {costDeleteError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {costDeleteError}
              </Alert>
            ) : null}
            <Typography variant="body2">
              Confirma a operação definitiva sobre <strong>{costDeletePreviewRows.length}</strong> linha(s) listadas?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCostDeleteFlow} disabled={costDeleteBusy}>
              Voltar
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => void confirmCostDelete()}
              disabled={costDeleteBusy}
            >
              {costDeleteBusy ? 'Excluindo...' : 'Excluir definitivamente'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Painel único de ações (como &quot;Gerenciar organograma&quot;) */}
        <Dialog open={manageDialogOpen} onClose={() => setManageDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Gerenciar custos do departamento</DialogTitle>
          <DialogContent>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Tooltip title="Atualizar mapa e organograma">
                <IconButton
                  color="primary"
                  onClick={() => {
                    void fetchGraph()
                    void fetchEntries()
                  }}
                  aria-label="Atualizar dados"
                >
                  <RefreshCw size={20} />
                </IconButton>
              </Tooltip>
            </Stack>
            <Typography variant="subtitle2" gutterBottom>
              Ações
            </Typography>
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Building2 size={18} />}
                onClick={() => {
                  setManageDialogOpen(false)
                  canvasSpawnRef.current = null
                  setDeptDialog(true)
                }}
              >
                Novo departamento…
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Plus size={18} />}
                onClick={() => {
                  setManageDialogOpen(false)
                  canvasSpawnRef.current = null
                  setCostDialog(true)
                }}
              >
                Novo custo fixo…
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Link2 size={18} />}
                onClick={() => {
                  setManageDialogOpen(false)
                  canvasSpawnRef.current = null
                  openLink()
                }}
              >
                Vincular custo a departamento…
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<UserPlus size={18} />}
                onClick={() => {
                  setManageDialogOpen(false)
                  canvasSpawnRef.current = null
                  openMember()
                }}
              >
                Pessoa no departamento (custo individual)…
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<UserCircle size={18} />}
                onClick={() => {
                  setManageDialogOpen(false)
                  setAssignDialogOpen(true)
                  setFormErr(null)
                  const d0 = graph?.departments?.[0]
                  setAssignDeptId(d0?.id ?? '')
                  setAssignEntryId('')
                  void fetchEntries()
                }}
              >
                Responsável no organograma…
              </Button>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Departamentos e responsáveis (organograma)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Departamento</TableCell>
                  <TableCell>Responsáveis cadastrados no organograma</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(graph?.departments ?? []).map((d) => {
                  const rs = responsiblesForDept(d.id)
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>
                        {rs.length === 0 ? (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        ) : (
                          rs.map((e: OrgEntry) => entryLabel(e)).join(' · ')
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setManageDialogOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Vincular pessoa do organograma ao departamento (cdt_user_org.department_id) */}
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Responsável no organograma</DialogTitle>
          <DialogContent>
            {formErr && assignDialogOpen ? <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert> : null}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Escolha um departamento e uma pessoa já cadastrada em <strong>Organograma da Empresa</strong>. Isso atualiza
              o vínculo usado neste mapa e na tabela abaixo (não substitui &quot;pessoa no departamento&quot; com custo
              individual, que usa usuários do sistema).
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Departamento</InputLabel>
              <Select value={assignDeptId} label="Departamento" onChange={(e) => setAssignDeptId(e.target.value)}>
                {(graph?.departments ?? []).map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Pessoa no organograma</InputLabel>
              <Select value={assignEntryId} label="Pessoa no organograma" onChange={(e) => setAssignEntryId(e.target.value)}>
                {orgEntries.map((e: OrgEntry) => (
                  <MenuItem key={e.id} value={e.id}>
                    {entryLabel(e)}
                    {e.department_id
                      ? ` → ${graph?.departments.find((x) => x.id === e.department_id)?.name ?? 'outro dept.'}`
                      : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" sx={{ mt: 1 }} onClick={() => void handleSaveAssignResponsible()} disabled={saving}>
              Vincular a este departamento
            </Button>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" gutterBottom>
              Já vinculados a este departamento
            </Typography>
            {assignDeptId ? (
              responsiblesForDept(assignDeptId).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma pessoa do organograma vinculada a este departamento.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Pessoa</TableCell>
                      <TableCell align="right">Ação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {responsiblesForDept(assignDeptId).map((e: OrgEntry) => (
                      <TableRow key={e.id}>
                        <TableCell>{entryLabel(e)}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            color="warning"
                            onClick={() => void handleUnlinkOrgResponsible(e.id)}
                            disabled={saving}
                          >
                            Desvincular
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignDialogOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: departamento */}
        <Dialog
          open={deptDialog}
          onClose={() => {
            setDeptDialog(false)
            setDeptOrgEntryId('')
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Novo departamento</DialogTitle>
          <DialogContent>
            {formErr && deptDialog ? <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert> : null}
            <TextField
              label="Nome"
              fullWidth
              margin="normal"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
            />
            <TextField
              label="Descrição"
              fullWidth
              margin="normal"
              multiline
              minRows={2}
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Responsável (organograma, opcional)</InputLabel>
              <Select
                value={deptOrgEntryId}
                label="Responsável (organograma, opcional)"
                onChange={(e) => setDeptOrgEntryId(e.target.value)}
              >
                <MenuItem value="">— Nenhum —</MenuItem>
                {orgEntries.map((e: OrgEntry) => (
                  <MenuItem key={e.id} value={e.id}>
                    {entryLabel(e)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -0.5, mb: 1 }}>
              Pessoas são cadastradas em <strong>Organograma da Empresa</strong>. Você pode vincular depois em
              &quot;Gerenciar&quot; → Responsável no organograma.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeptDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={() => void handleCreateDept()} disabled={saving}>
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: custo */}
        <Dialog open={costDialog} onClose={() => setCostDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Novo custo fixo</DialogTitle>
          <DialogContent>
            {formErr && costDialog ? <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert> : null}
            <TextField
              label="Nome"
              fullWidth
              margin="normal"
              value={costName}
              onChange={(e) => setCostName(e.target.value)}
            />
            <TextField
              label="Valor (mensal)"
              fullWidth
              margin="normal"
              type="text"
              inputMode="decimal"
              value={costAmount}
              onChange={(e) => setCostAmount(e.target.value)}
              placeholder="Ex.: 1.250,50"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Categoria</InputLabel>
              <Select value={costCategory} label="Categoria" onChange={(e) => setCostCategory(e.target.value)}>
                <MenuItem value="ferramenta">Ferramenta</MenuItem>
                <MenuItem value="licenca">Licença</MenuItem>
                <MenuItem value="infraestrutura">Infraestrutura</MenuItem>
                <MenuItem value="servico">Serviço</MenuItem>
                <MenuItem value="outro">Outro</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCostDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={() => void handleCreateCost()} disabled={saving}>
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: vincular */}
        <Dialog open={linkDialog} onClose={() => setLinkDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Vincular custo ao departamento</DialogTitle>
          <DialogContent>
            {formErr && linkDialog ? <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert> : null}
            <FormControl fullWidth margin="normal">
              <InputLabel>Departamento</InputLabel>
              <Select value={linkDeptId} label="Departamento" onChange={(e) => setLinkDeptId(e.target.value)}>
                {(graph?.departments ?? []).map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Custo</InputLabel>
              <Select value={linkCostId} label="Custo" onChange={(e) => setLinkCostId(e.target.value)}>
                {(graph?.costItems ?? []).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLinkDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={() => void handleLink()} disabled={saving}>
              Vincular
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: editar custo */}
        <Dialog
          open={editCostOpen}
          onClose={() => {
            setEditCostOpen(false)
            setEditCostId(null)
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Editar custo fixo</DialogTitle>
          <DialogContent>
            {editCostErr ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {editCostErr}
              </Alert>
            ) : null}
            <TextField label="Nome" fullWidth margin="normal" value={ecName} onChange={(e) => setEcName(e.target.value)} />
            <TextField
              label="Descrição"
              fullWidth
              margin="normal"
              multiline
              minRows={2}
              value={ecDescription}
              onChange={(e) => setEcDescription(e.target.value)}
            />
            <TextField
              label="Valor (mensal)"
              fullWidth
              margin="normal"
              type="text"
              inputMode="decimal"
              value={ecAmount}
              onChange={(e) => setEcAmount(e.target.value)}
              placeholder="Ex.: 2.000,00"
            />
            <TextField
              label="Moeda"
              fullWidth
              margin="normal"
              value={ecCurrency}
              onChange={() => setEcCurrency('BRL')}
              placeholder="BRL"
              disabled
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select value={ecStatus} label="Status" onChange={(e) => setEcStatus(e.target.value)}>
                <MenuItem value="analise">Análise</MenuItem>
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="desativado">Desativado</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Categoria</InputLabel>
              <Select value={ecCategory} label="Categoria" onChange={(e) => setEcCategory(e.target.value)}>
                <MenuItem value="ferramenta">Ferramenta</MenuItem>
                <MenuItem value="licenca">Licença</MenuItem>
                <MenuItem value="infraestrutura">Infraestrutura</MenuItem>
                <MenuItem value="servico">Serviço</MenuItem>
                <MenuItem value="outro">Outro</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={ecIsActive} onChange={(e) => setEcIsActive(e.target.checked)} />}
              label="Custo ativo (conta nos totais operacionais)"
              sx={{ mt: 1, display: 'block' }}
            />
            <TextField
              label="Atividades que este custo viabiliza (Y)"
              fullWidth
              margin="normal"
              multiline
              minRows={2}
              value={ecActivities}
              onChange={(e) => setEcActivities(e.target.value)}
              helperText="Narrativa de validação da operação"
            />
            <TextField
              label="Resultado / economia para a empresa (Z)"
              fullWidth
              margin="normal"
              multiline
              minRows={2}
              value={ecResultDesc}
              onChange={(e) => setEcResultDesc(e.target.value)}
            />
            <TextField
              label="Valor estimado de resultado/economia (opcional)"
              fullWidth
              margin="normal"
              type="text"
              inputMode="decimal"
              value={ecResultAmount}
              onChange={(e) => setEcResultAmount(e.target.value)}
              placeholder="Ex.: 500,00"
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setEditCostOpen(false)
                setEditCostId(null)
              }}
            >
              Cancelar
            </Button>
            <Button variant="contained" onClick={() => void handleSaveEditCost()} disabled={saving}>
              Salvar alterações
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: membro */}
        <Dialog open={memberDialog} onClose={() => setMemberDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Pessoa no departamento</DialogTitle>
          <DialogContent>
            {formErr && memberDialog ? <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert> : null}
            <FormControl fullWidth margin="normal">
              <InputLabel>Departamento</InputLabel>
              <Select value={memDeptId} label="Departamento" onChange={(e) => setMemDeptId(e.target.value)}>
                {(graph?.departments ?? []).map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Usuário</InputLabel>
              <Select value={memUserId} label="Usuário" onChange={(e) => setMemUserId(e.target.value)}>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Custo mensal individual"
              fullWidth
              margin="normal"
              type="text"
              inputMode="decimal"
              value={memCost}
              onChange={(e) => setMemCost(e.target.value)}
              placeholder="Ex.: 3.500,00"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMemberDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={() => void handleMember()} disabled={saving}>
              Salvar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  )
}
