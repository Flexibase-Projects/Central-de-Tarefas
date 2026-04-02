import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ConnectionLineType,
  MarkerType,
  type Edge,
  type Node,
  type OnConnect,
  type XYPosition,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Box, CircularProgress, Menu, MenuItem, Snackbar, Alert, Typography, useTheme } from '@/compat/mui/material'
import { layoutWithDagre } from '@/components/tree-funnel/dagreLayout'
import type { CostManagementGraph, CostItem, CostCanvasFocus } from '@/types/cost-org'
import type { OrgEntry } from '@/hooks/use-org'
import type { DeptFlowData, CostFlowData, MemberFlowData } from './CostFlowNodes'
import { DepartmentCostNode, CostItemFlowNode, MemberFlowNode } from './CostFlowNodes'
import { loadCostCanvasPositions, saveCostCanvasPositions } from './costCanvasPositions'

export type { CostCanvasFocus } from '@/types/cost-org'

const nodeTypes = {
  deptCost: DepartmentCostNode,
  costItem: CostItemFlowNode,
  memberCost: MemberFlowNode,
}

/** Centraliza o card aproximadamente no ponto clicado (coordenadas do fluxo) */
const SPAWN_OFFSET_DEPT: XYPosition = { x: -110, y: -36 }
const SPAWN_OFFSET_COST: XYPosition = { x: -100, y: -48 }

export type DeptCostEdgeData = {
  linkKind: 'dept-cost'
  departmentId: string
  costId: string
}

/** Cores sólidas: `var(--mui-*)` em `stroke`/`marker` dentro de SVG do React Flow costuma falhar → linha some e só aparece a seta. */
const EDGE_NEUTRAL = '#94a3b8'
const EDGE_DEPT_ACTIVE = '#6366f1'
const EDGE_COST_ACTIVE = '#a855f7'
const EDGE_MEMBER_ACTIVE = '#22c55e'

/** Seta no destino, discreta (estilo grafo fino) */
function arrowToTarget(strokeColor: string) {
  return {
    type: MarkerType.ArrowClosed as const,
    width: 12,
    height: 12,
    color: strokeColor,
  }
}

function nodeRefType(id: string): 'dept' | 'cost' | 'mem' {
  if (id.startsWith('dept-')) return 'dept'
  if (id.startsWith('cost-')) return 'cost'
  if (id.startsWith('mem-')) return 'mem'
  return 'mem'
}

function parseDeptCostFromNodes(source: string, target: string): { departmentId: string; costId: string } | null {
  const a = nodeRefType(source)
  const b = nodeRefType(target)
  if (a === 'dept' && b === 'cost') {
    return { departmentId: source.slice(5), costId: target.slice(5) }
  }
  if (a === 'cost' && b === 'dept') {
    return { departmentId: target.slice(5), costId: source.slice(5) }
  }
  return null
}

function isValidDeptCostConnectionLike(c: { source?: string | null; target?: string | null }): boolean {
  const s = c.source
  const t = c.target
  if (!s || !t) return false
  const st = nodeRefType(s)
  const tt = nodeRefType(t)
  return (st === 'dept' && tt === 'cost') || (st === 'cost' && tt === 'dept')
}

function focusSignature(f: CostCanvasFocus | null): string {
  if (!f) return ''
  if (f.kind === 'department') return `d:${f.departmentId}`
  if (f.kind === 'cost') return `c:${f.costId}`
  return `m:${f.departmentId}:${f.userId}`
}

function deptNodeHighlighted(
  focus: CostCanvasFocus | null,
  deptId: string,
  departmentCosts: { department_id: string; cost_id: string }[]
): boolean {
  if (!focus) return false
  if (focus.kind === 'department') return focus.departmentId === deptId
  if (focus.kind === 'cost')
    return departmentCosts.some((l) => l.department_id === deptId && l.cost_id === focus.costId)
  if (focus.kind === 'member') return focus.departmentId === deptId
  return false
}

function costNodeHighlighted(
  focus: CostCanvasFocus | null,
  costId: string,
  departmentCosts: { department_id: string; cost_id: string }[]
): boolean {
  if (!focus) return false
  if (focus.kind === 'department')
    return departmentCosts.some((l) => l.department_id === focus.departmentId && l.cost_id === costId)
  if (focus.kind === 'cost') return focus.costId === costId
  return false
}

function memberNodeHighlighted(focus: CostCanvasFocus | null, deptId: string, userId: string): boolean {
  if (!focus) return false
  if (focus.kind === 'department') return focus.departmentId === deptId
  if (focus.kind === 'member') return focus.departmentId === deptId && focus.userId === userId
  return false
}

function graphToFlow(
  graph: CostManagementGraph,
  canvasFocus: CostCanvasFocus | null,
  orgEntries: OrgEntry[] = []
): { nodes: Node[]; edges: Edge[] } {
  const { departments, departmentCosts, members, costItems } = graph
  const costMap = new Map(costItems.map((c) => [c.id, c]))
  const nodes: Node[] = []
  const edges: Edge[] = []

  for (const d of departments) {
    const hid = deptNodeHighlighted(canvasFocus, d.id, departmentCosts)
    const responsibles = orgEntries
      .filter((e) => e.department_id === d.id)
      .map((e) => ({
        orgEntryId: e.id,
        personName: e.person_name,
        jobTitle: e.job_title,
      }))
    nodes.push({
      id: `dept-${d.id}`,
      type: 'deptCost',
      position: { x: 0, y: 0 },
      draggable: true,
      data: {
        name: d.name,
        departmentId: d.id,
        highlighted: hid,
        responsibles,
      },
    })
  }

  const costNodeAdded = new Set<string>()
  for (const l of departmentCosts) {
    const c = costMap.get(l.cost_id) as CostItem | undefined
    if (!c) continue
    const costNodeId = `cost-${c.id}`
    if (!costNodeAdded.has(c.id)) {
      costNodeAdded.add(c.id)
      const hid = costNodeHighlighted(canvasFocus, c.id, departmentCosts)
      nodes.push({
        id: costNodeId,
        type: 'costItem',
        position: { x: 0, y: 0 },
        draggable: true,
        data: {
          costId: c.id,
          name: c.name,
          amount: Number(c.amount) || 0,
          currency: c.currency || 'BRL',
          status: c.status,
          highlighted: hid,
        },
      })
    }
    const edgeHid =
      canvasFocus?.kind === 'department'
        ? canvasFocus.departmentId === l.department_id
        : canvasFocus?.kind === 'cost'
          ? canvasFocus.costId === l.cost_id
          : false
    const costStroke = edgeHid ? EDGE_COST_ACTIVE : EDGE_NEUTRAL
    edges.push({
      id: `dept-${l.department_id}-cost-${l.cost_id}`,
      type: 'default',
      source: `dept-${l.department_id}`,
      target: `cost-${l.cost_id}`,
      sourceHandle: 's-bottom',
      targetHandle: 't-top',
      style: {
        stroke: costStroke,
        strokeWidth: edgeHid ? 2 : 1.25,
      },
      markerEnd: arrowToTarget(costStroke),
      deletable: true,
      data: {
        linkKind: 'dept-cost',
        departmentId: l.department_id,
        costId: l.cost_id,
      } satisfies DeptCostEdgeData,
    })
  }

  for (const m of members) {
    const nodeId = `mem-${m.department_id}-${m.user_id}`
    const u = m.user
    const hid = memberNodeHighlighted(canvasFocus, m.department_id, m.user_id)
    nodes.push({
      id: nodeId,
      type: 'memberCost',
      position: { x: 0, y: 0 },
      draggable: true,
      connectable: false,
      data: {
        name: u?.name ?? m.user_id,
        monthlyCost: Number(m.individual_monthly_cost) || 0,
        avatarUrl: u?.avatar_url ?? null,
        highlighted: hid,
        departmentId: m.department_id,
        userId: m.user_id,
      },
    })
    const edgeHid =
      canvasFocus?.kind === 'department'
        ? canvasFocus.departmentId === m.department_id
        : canvasFocus?.kind === 'member'
          ? canvasFocus.departmentId === m.department_id && canvasFocus.userId === m.user_id
          : false
    const memStroke = edgeHid ? EDGE_MEMBER_ACTIVE : EDGE_NEUTRAL
    edges.push({
      id: `dept-${m.department_id}-mem-${m.user_id}`,
      type: 'simplebezier',
      source: `dept-${m.department_id}`,
      target: nodeId,
      sourceHandle: 's-bottom',
      targetHandle: 't-top',
      style: {
        stroke: memStroke,
        strokeWidth: edgeHid ? 2 : 1.25,
      },
      markerEnd: arrowToTarget(memStroke),
      deletable: false,
      selectable: false,
      focusable: false,
      data: { linkKind: 'dept-member' },
    })
  }

  return { nodes, edges }
}

/** Chaves estáveis do conteúdo (evita resetar nós a cada referência nova de `graph` e quebrar o drag de conexão) */
function graphContentKeys(g: CostManagementGraph) {
  return {
    deptKey: g.departments.map((d) => `${d.id}:${d.name}`).join('|'),
    costKey: g.costItems
      .map((c) => `${c.id}:${c.name}:${Number(c.amount)}:${c.status}`)
      .join('|'),
    memKey: g.members
      .map((m) => `${m.department_id}:${m.user_id}:${Number(m.individual_monthly_cost)}`)
      .join('|'),
    dcKey: g.departmentCosts.map((l) => `${l.department_id}:${l.cost_id}`).join('|'),
  }
}

function structureSignature(graph: CostManagementGraph): string {
  return JSON.stringify({
    d: [...graph.departments].sort((a, b) => a.id.localeCompare(b.id)).map((x) => x.id),
    ci: [...graph.costItems].sort((a, b) => a.id.localeCompare(b.id)).map((x) => x.id),
    dc: [...graph.departmentCosts]
      .sort((a, b) => `${a.department_id}-${a.cost_id}`.localeCompare(`${b.department_id}-${b.cost_id}`))
      .map((l) => [l.department_id, l.cost_id]),
    mem: [...graph.members]
      .sort((a, b) => `${a.department_id}-${a.user_id}`.localeCompare(`${b.department_id}-${b.user_id}`))
      .map((m) => [m.department_id, m.user_id]),
  })
}

export type CanvasDialogAction = 'dept' | 'cost' | 'link' | 'member' | 'assignResponsible'

export type CanvasDialogContext = {
  departmentId?: string
  costId?: string
  /** Coordenadas do fluxo onde o menu foi aberto (spawn de novos nós) */
  flowX?: number
  flowY?: number
}

export type PendingNodePlacement = { nodeId: string; x: number; y: number }

type ContextMenuState =
  | { mouseX: number; mouseY: number; flowX: number; flowY: number; variant: 'pane' }
  | { mouseX: number; mouseY: number; flowX: number; flowY: number; variant: 'dept'; departmentId: string }
  | { mouseX: number; mouseY: number; flowX: number; flowY: number; variant: 'cost'; costId: string }

type Props = {
  graph: CostManagementGraph | null
  loading: boolean
  error: string | null
  workspaceSlug?: string | null
  /** Nó selecionado: destaque no mapa + tipicamente drawer na página pai */
  canvasFocus: CostCanvasFocus | null
  onCanvasFocusChange: (focus: CostCanvasFocus | null) => void
  onLinkCostToDepartment: (departmentId: string, costId: string) => Promise<void>
  onUnlinkCostFromDepartment: (departmentId: string, costId: string) => Promise<void>
  onRefreshGraph: () => Promise<void>
  onOpenCanvasDialog?: (action: CanvasDialogAction, context?: CanvasDialogContext) => void
  /** Após criar nó pela API, posiciona no canvas e consome o pending */
  pendingNodePlacement?: PendingNodePlacement | null
  onConsumedPendingNodePlacement?: () => void
  /** Pessoas do organograma (cdt_user_org) — `department_id` liga ao custo por departamento */
  orgEntries?: OrgEntry[]
  /** Mesmo padrão do organograma: preenche altura do flex pai */
  fillHeight?: boolean
}

function ScreenToFlowBinder({
  flowFnRef,
}: {
  flowFnRef: MutableRefObject<((position: XYPosition) => XYPosition) | null>
}) {
  const { screenToFlowPosition } = useReactFlow()
  useLayoutEffect(() => {
    flowFnRef.current = screenToFlowPosition
  }, [screenToFlowPosition, flowFnRef])
  return null
}

function CostCanvasCore({
  graph,
  canvasFocus,
  onCanvasFocusChange,
  onLinkCostToDepartment,
  onUnlinkCostFromDepartment,
  onRefreshGraph,
  onOpenCanvasDialog,
  pendingNodePlacement,
  onConsumedPendingNodePlacement,
  orgEntries = [],
  fillHeight = false,
  workspaceSlug,
}: Omit<Props, 'graph' | 'loading' | 'error'> & { graph: CostManagementGraph }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const screenToFlowRef = useRef<((position: XYPosition) => XYPosition) | null>(null)
  const layoutPositionsRef = useRef<Record<string, XYPosition>>({})

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null)

  const [manualPositions, setManualPositions] = useState<Record<string, XYPosition>>(() => loadCostCanvasPositions(workspaceSlug))

  useEffect(() => {
    setManualPositions(loadCostCanvasPositions(workspaceSlug))
  }, [workspaceSlug])

  const keys = graphContentKeys(graph)

  const structureSig = useMemo(
    () => structureSignature(graph),
    [keys.deptKey, keys.costKey, keys.memKey, keys.dcKey]
  )

  const layoutPositions = useMemo(() => {
    const { nodes: n, edges: e } = graphToFlow(graph, null)
    if (n.length === 0) return {} as Record<string, XYPosition>
    const laid = layoutWithDagre(n, e)
    return Object.fromEntries(laid.map((node) => [node.id, node.position]))
    // só quando a estrutura (ids/links) muda — não depender da referência de `graph`
  }, [structureSig])

  useEffect(() => {
    layoutPositionsRef.current = layoutPositions
  }, [layoutPositions])

  useEffect(() => {
    setManualPositions((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(next)) {
        if (!(k in layoutPositions)) delete next[k]
      }
      return next
    })
  }, [structureSig, layoutPositions])

  const mergedPositions = useMemo(() => {
    const ids = new Set([...Object.keys(layoutPositions), ...Object.keys(manualPositions)])
    const out: Record<string, XYPosition> = {}
    for (const id of ids) {
      out[id] = manualPositions[id] ?? layoutPositions[id] ?? { x: 0, y: 0 }
    }
    return out
  }, [layoutPositions, manualPositions])

  const orgResponsibleSig = useMemo(
    () =>
      orgEntries
        .map((e) => `${e.id}:${e.department_id ?? ''}:${e.person_name}:${e.job_title ?? ''}`)
        .sort()
        .join('|'),
    [orgEntries]
  )

  const focusSig = focusSignature(canvasFocus)

  const displayNodes = useMemo(() => {
    const { nodes: n } = graphToFlow(graph, canvasFocus, orgEntries)
    return n.map((node) => ({
      ...node,
      position: mergedPositions[node.id] ?? { x: 0, y: 0 },
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `graph`/`orgEntries`/`canvasFocus` via closure; keys + sigs
  }, [
    keys.deptKey,
    keys.costKey,
    keys.memKey,
    keys.dcKey,
    structureSig,
    focusSig,
    mergedPositions,
    orgResponsibleSig,
  ])

  const displayEdges = useMemo(
    () => graphToFlow(graph, canvasFocus, orgEntries).edges,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keys.deptKey, keys.costKey, keys.memKey, keys.dcKey, structureSig, focusSig, orgResponsibleSig]
  )

  useEffect(() => {
    setNodes(displayNodes)
    setEdges(displayEdges)
  }, [displayNodes, displayEdges, setNodes, setEdges])

  useEffect(() => {
    if (!pendingNodePlacement) return
    const { nodeId, x, y } = pendingNodePlacement
    setManualPositions((prev) => {
      const next = { ...prev, [nodeId]: { x, y } }
      saveCostCanvasPositions({ ...layoutPositionsRef.current, ...next }, workspaceSlug)
      return next
    })
    onConsumedPendingNodePlacement?.()
  }, [onConsumedPendingNodePlacement, pendingNodePlacement, workspaceSlug])

  const persistMerged = useCallback((override: Record<string, XYPosition>) => {
    saveCostCanvasPositions({ ...layoutPositionsRef.current, ...override }, workspaceSlug)
  }, [workspaceSlug])

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      setManualPositions((prev) => {
        const next = { ...prev, [node.id]: { ...node.position } }
        persistMerged(next)
        return next
      })
    },
    [persistMerged]
  )

  const toFlow = useCallback((clientX: number, clientY: number): XYPosition => {
    const fn = screenToFlowRef.current
    if (fn) return fn({ x: clientX, y: clientY })
    return { x: clientX, y: clientY }
  }, [])

  const onConnect = useCallback<OnConnect>(
    async (params) => {
      const parsed = parseDeptCostFromNodes(params.source, params.target)
      if (!parsed) return
      try {
        await onLinkCostToDepartment(parsed.departmentId, parsed.costId)
        setToast({ message: 'Custo vinculado ao departamento.', severity: 'success' })
      } catch (e) {
        const msg = (e as Error).message
        setToast({
          message: /already exists|já existe|Link already|23505/i.test(msg)
            ? 'Este custo já está vinculado a este departamento.'
            : msg,
          severity: 'error',
        })
        await onRefreshGraph()
      }
    },
    [onLinkCostToDepartment, onRefreshGraph]
  )

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      void (async () => {
        for (const edge of deleted) {
          const d = edge.data as DeptCostEdgeData | undefined
          if (d?.linkKind !== 'dept-cost') continue
          try {
            await onUnlinkCostFromDepartment(d.departmentId, d.costId)
            setToast({ message: 'Vínculo removido.', severity: 'success' })
          } catch (e) {
            setToast({ message: (e as Error).message, severity: 'error' })
            await onRefreshGraph()
          }
        }
      })()
    },
    [onUnlinkCostFromDepartment, onRefreshGraph]
  )

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      setCtxMenu(null)
      if (node.type === 'deptCost') {
        const id = (node.data as DeptFlowData).departmentId
        if (id) onCanvasFocusChange({ kind: 'department', departmentId: id })
        return
      }
      if (node.type === 'costItem') {
        const costId = (node.data as CostFlowData).costId
        if (costId) onCanvasFocusChange({ kind: 'cost', costId })
        return
      }
      if (node.type === 'memberCost') {
        const d = node.data as MemberFlowData
        if (d.departmentId && d.userId) {
          onCanvasFocusChange({ kind: 'member', departmentId: d.departmentId, userId: d.userId })
        }
      }
    },
    [onCanvasFocusChange]
  )

  const onPaneContextMenu = useCallback(
    (e: { preventDefault(): void; clientX: number; clientY: number }) => {
      e.preventDefault()
      const p = toFlow(e.clientX, e.clientY)
      setCtxMenu({ mouseX: e.clientX, mouseY: e.clientY, flowX: p.x, flowY: p.y, variant: 'pane' })
    },
    [toFlow]
  )

  const onNodeContextMenu = useCallback(
    (e: { preventDefault(): void; clientX: number; clientY: number }, node: Node) => {
      e.preventDefault()
      const p = toFlow(e.clientX, e.clientY)
      if (node.type === 'deptCost') {
        const departmentId = (node.data as DeptFlowData).departmentId
        setCtxMenu({ mouseX: e.clientX, mouseY: e.clientY, flowX: p.x, flowY: p.y, variant: 'dept', departmentId })
        return
      }
      if (node.type === 'costItem') {
        const costId = (node.data as CostFlowData).costId
        setCtxMenu({ mouseX: e.clientX, mouseY: e.clientY, flowX: p.x, flowY: p.y, variant: 'cost', costId })
        return
      }
      setCtxMenu({ mouseX: e.clientX, mouseY: e.clientY, flowX: p.x, flowY: p.y, variant: 'pane' })
    },
    [toFlow]
  )

  const closeCtx = useCallback(() => setCtxMenu(null), [])

  const ctxPayload = useCallback((m: ContextMenuState): CanvasDialogContext => {
    const base: CanvasDialogContext = { flowX: m.flowX, flowY: m.flowY }
    if (m.variant === 'dept') base.departmentId = m.departmentId
    if (m.variant === 'cost') base.costId = m.costId
    return base
  }, [])

  const fireDialog = useCallback(
    (action: CanvasDialogAction, extra?: Partial<CanvasDialogContext>) => {
      if (!ctxMenu) return
      const payload = { ...ctxPayload(ctxMenu), ...extra }
      closeCtx()
      onOpenCanvasDialog?.(action, payload)
    },
    [closeCtx, ctxMenu, ctxPayload, onOpenCanvasDialog]
  )

  const flowFrameSx = fillHeight
    ? { flex: 1, minHeight: 0, position: 'relative' as const, width: '100%' }
    : { height: '100%', minHeight: 360, position: 'relative' as const, width: '100%' }

  return (
    <>
      <Box sx={flowFrameSx}>
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={onNodeDragStop}
          isValidConnection={(c) => isValidDeptCostConnectionLike(c)}
          onNodeClick={onNodeClick}
          onPaneClick={() => {
            closeCtx()
            onCanvasFocusChange(null)
          }}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          nodeTypes={nodeTypes}
          minZoom={0.2}
          maxZoom={1.5}
          deleteKeyCode={['Backspace', 'Delete']}
          edgesReconnectable={false}
          nodesConnectable
          nodesDraggable
          edgesFocusable
          connectionRadius={28}
          connectionLineType={ConnectionLineType.Bezier}
          proOptions={{ hideAttribution: true }}
          connectionLineStyle={{ stroke: EDGE_DEPT_ACTIVE, strokeWidth: 1.5 }}
          defaultEdgeOptions={{
            type: 'default',
            style: { stroke: EDGE_NEUTRAL, strokeWidth: 1.25 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 12,
              height: 12,
              color: EDGE_DEPT_ACTIVE,
            },
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          colorMode={isDark ? 'dark' : 'light'}
        >
          <ScreenToFlowBinder flowFnRef={screenToFlowRef} />
          <Background
            gap={16}
            color={isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.35)'}
            bgColor={isDark ? '#0f172a' : '#ffffff'}
          />
          <Controls
            className="cost-flow-controls"
            style={{
              background: isDark ? 'rgba(15,23,42,0.9)' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.35)'}`,
              borderRadius: 8,
              boxShadow: isDark ? '0 8px 20px rgba(0,0,0,0.35)' : '0 6px 16px rgba(15,23,42,0.12)',
            }}
          />
          <MiniMap
            pannable
            zoomable
            style={{
              backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.35)'}`,
              borderRadius: 8,
              boxShadow: isDark ? '0 8px 20px rgba(0,0,0,0.35)' : '0 6px 16px rgba(15,23,42,0.12)',
            }}
            maskColor={isDark ? 'rgba(2,6,23,0.45)' : 'rgba(148,163,184,0.22)'}
            nodeColor={isDark ? '#94a3b8' : '#64748b'}
          />
        </ReactFlow>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            '& .cost-flow-controls .react-flow__controls-button': {
              pointerEvents: 'auto',
              color: isDark ? '#60A5FA' : '#2563EB',
              borderColor: isDark ? 'rgba(96,165,250,0.35)' : 'rgba(37,99,235,0.28)',
              backgroundColor: isDark ? 'rgba(30,41,59,0.92)' : 'rgba(255,255,255,0.95)',
              transition: 'all 0.15s ease',
            },
            '& .cost-flow-controls .react-flow__controls-button:hover': {
              backgroundColor: isDark ? 'rgba(37,99,235,0.22)' : 'rgba(37,99,235,0.1)',
              color: isDark ? '#93C5FD' : '#1D4ED8',
            },
            '& .cost-flow-controls .react-flow__controls-button:focus-visible': {
              outline: '2px solid',
              outlineColor: isDark ? 'rgba(96,165,250,0.55)' : 'rgba(37,99,235,0.45)',
              outlineOffset: '-1px',
            },
          }}
        />
      </Box>

      <Menu
        open={Boolean(ctxMenu)}
        onClose={closeCtx}
        anchorReference="anchorPosition"
        anchorPosition={ctxMenu ? { top: ctxMenu.mouseY, left: ctxMenu.mouseX } : undefined}
        slotProps={{
          root: { onContextMenu: (e: { preventDefault(): void }) => e.preventDefault() },
        }}
      >
        {ctxMenu?.variant === 'pane' && (
          <>
            <MenuItem
              onClick={() =>
                fireDialog('dept', {
                  flowX: ctxMenu.flowX + SPAWN_OFFSET_DEPT.x,
                  flowY: ctxMenu.flowY + SPAWN_OFFSET_DEPT.y,
                })
              }
            >
              Novo departamento…
            </MenuItem>
            <MenuItem
              onClick={() =>
                fireDialog('cost', {
                  flowX: ctxMenu.flowX + SPAWN_OFFSET_COST.x,
                  flowY: ctxMenu.flowY + SPAWN_OFFSET_COST.y,
                })
              }
            >
              Novo custo fixo…
            </MenuItem>
            <MenuItem onClick={() => fireDialog('link')}>Vincular custo a departamento…</MenuItem>
            <MenuItem onClick={() => fireDialog('member')}>Pessoa no departamento…</MenuItem>
            <MenuItem onClick={() => fireDialog('assignResponsible')}>
              Responsável (organograma)…
            </MenuItem>
          </>
        )}
        {ctxMenu?.variant === 'dept' && (
          <>
            <MenuItem
              onClick={() => fireDialog('assignResponsible', { departmentId: ctxMenu.departmentId })}
            >
              Responsável (organograma)…
            </MenuItem>
            <MenuItem onClick={() => fireDialog('link', { departmentId: ctxMenu.departmentId })}>
              Vincular custo a este departamento…
            </MenuItem>
            <MenuItem onClick={() => fireDialog('member', { departmentId: ctxMenu.departmentId })}>
              Adicionar pessoa neste departamento…
            </MenuItem>
            <MenuItem
              onClick={() =>
                fireDialog('cost', {
                  flowX: ctxMenu.flowX + SPAWN_OFFSET_COST.x,
                  flowY: ctxMenu.flowY + SPAWN_OFFSET_COST.y,
                })
              }
            >
              Novo custo fixo (aqui)…
            </MenuItem>
            <MenuItem
              onClick={() =>
                fireDialog('dept', {
                  flowX: ctxMenu.flowX + SPAWN_OFFSET_DEPT.x,
                  flowY: ctxMenu.flowY + SPAWN_OFFSET_DEPT.y,
                })
              }
            >
              Novo departamento (aqui)…
            </MenuItem>
          </>
        )}
        {ctxMenu?.variant === 'cost' && (
          <>
            <MenuItem
              onClick={() => {
                const id = ctxMenu.costId
                closeCtx()
                onCanvasFocusChange({ kind: 'cost', costId: id })
              }}
            >
              Ver / editar este custo…
            </MenuItem>
            <MenuItem onClick={() => fireDialog('link', { costId: ctxMenu.costId })}>
              Vincular a outro departamento…
            </MenuItem>
          </>
        )}
      </Menu>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)} variant="filled" sx={{ width: '100%' }}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export function CostTreeFlow({
  graph,
  loading,
  error,
  workspaceSlug,
  canvasFocus,
  onCanvasFocusChange,
  onLinkCostToDepartment,
  onUnlinkCostFromDepartment,
  onRefreshGraph,
  onOpenCanvasDialog,
  pendingNodePlacement,
  onConsumedPendingNodePlacement,
  orgEntries = [],
  fillHeight = false,
}: Props) {
  const frameSx = fillHeight
    ? {
        flex: 1,
        minHeight: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        borderRadius: 2,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
      }
    : {
        width: '100%',
        height: { xs: 'min(72vh, 640px)', md: 'calc(100vh - 240px)' },
        minHeight: { xs: 480, md: 560 },
        maxHeight: { md: 'min(calc(100vh - 200px), 1100px)' },
        borderRadius: 2,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
      }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(fillHeight
            ? { flex: 1, minHeight: 200, width: '100%' }
            : { minHeight: { xs: 480, md: 'calc(100vh - 260px)' } }),
        }}
      >
        <CircularProgress />
      </Box>
    )
  }
  if (error) {
    return (
      <Box sx={{ p: 2, ...(fillHeight ? { flex: 1, minHeight: 0, overflow: 'auto' } : {}) }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }
  if (!graph || graph.departments.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', ...(fillHeight ? { flex: 1, overflow: 'auto' } : {}) }}>
        <Typography color="text.secondary">
          Nenhum departamento cadastrado. Crie um departamento para montar a árvore de custos. Execute a migração
          003_cost_management.sql se as tabelas não existirem.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={frameSx}>
      <Box
        sx={
          fillHeight
            ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }
            : { height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }
        }
      >
        <ReactFlowProvider>
        <CostCanvasCore
          graph={graph}
          workspaceSlug={workspaceSlug}
          canvasFocus={canvasFocus}
            onCanvasFocusChange={onCanvasFocusChange}
            onLinkCostToDepartment={onLinkCostToDepartment}
            onUnlinkCostFromDepartment={onUnlinkCostFromDepartment}
            onRefreshGraph={onRefreshGraph}
            onOpenCanvasDialog={onOpenCanvasDialog}
            pendingNodePlacement={pendingNodePlacement}
            onConsumedPendingNodePlacement={onConsumedPendingNodePlacement}
            orgEntries={orgEntries}
            fillHeight={fillHeight}
          />
        </ReactFlowProvider>
      </Box>
    </Box>
  )
}
