import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionLineType,
  MarkerType,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Box, CircularProgress, Typography, useTheme } from '@/compat/mui/material'
import { layoutWithDagre } from '@/components/tree-funnel/dagreLayout'
import type { OrgTreeNode } from '@/types/cost-org'
import OrgPersonNode from './OrgPersonNode'

const nodeTypes = { orgPerson: OrgPersonNode }

/** Cores sólidas: `var(--mui-*)` em stroke dentro do SVG do React Flow pode falhar (igual tela de custos). */
const EDGE_ORG = '#94a3b8'
const EDGE_ORG_ACTIVE = '#a855f7'

function arrowToTarget(strokeColor: string) {
  return {
    type: MarkerType.ArrowClosed as const,
    width: 12,
    height: 12,
    color: strokeColor,
  }
}

function treeToNodesEdges(roots: OrgTreeNode[], highlighted: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  function walk(n: OrgTreeNode) {
    const id = `org-${n.orgEntryId}`
    nodes.push({
      id,
      type: 'orgPerson',
      position: { x: 0, y: 0 },
      data: {
        personName: n.personName,
        jobTitle: n.jobTitle,
        orgEntryId: n.orgEntryId,
        highlighted: highlighted.has(n.orgEntryId),
      },
    })
    for (const c of n.children) {
      const edgeHid = highlighted.has(c.orgEntryId) && highlighted.has(n.orgEntryId)
      const stroke = edgeHid ? EDGE_ORG_ACTIVE : EDGE_ORG
      edges.push({
        id: `e-${n.orgEntryId}-${c.orgEntryId}`,
        type: 'simplebezier',
        source: id,
        target: `org-${c.orgEntryId}`,
        sourceHandle: 's-bottom',
        targetHandle: 't-top',
        animated: edgeHid,
        style: {
          stroke,
          strokeWidth: edgeHid ? 2 : 1.25,
        },
        markerEnd: arrowToTarget(stroke),
      })
      walk(c)
    }
  }
  for (const r of roots) walk(r)
  return { nodes, edges }
}

type Props = {
  tree: OrgTreeNode[]
  loading: boolean
  error: string | null
  highlightedIds: Set<string>
  onSelectEntry: (entryId: string) => void
  /** Ocupa toda altura do pai (flex); use com container flex:1 minHeight:0 */
  fillHeight?: boolean
}

export function OrgTreeFlow({ tree, loading, error, highlightedIds, onSelectEntry, fillHeight }: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const laidOut = useMemo(() => {
    const { nodes: n, edges: e } = treeToNodesEdges(tree, highlightedIds)
    if (n.length === 0) return { nodes: n, edges: e }
    return { nodes: layoutWithDagre(n, e), edges: e }
  }, [tree, highlightedIds])

  useEffect(() => {
    setNodes(laidOut.nodes)
    setEdges(laidOut.edges)
  }, [laidOut, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const eid = (node.data as { orgEntryId?: string }).orgEntryId
      if (eid) onSelectEntry(eid)
    },
    [onSelectEntry]
  )

  const frameSx = fillHeight
    ? { flex: 1, minHeight: 0, width: '100%', height: '100%' }
    : { width: '100%', height: { xs: 480, md: 560 } }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: fillHeight ? 200 : 420,
          ...frameSx,
        }}
      >
        <CircularProgress />
      </Box>
    )
  }
  if (error) {
    return (
      <Box sx={{ p: 2, ...frameSx }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }
  if (tree.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', ...frameSx }}>
        <Typography color="text.secondary">
          Nenhuma pessoa no organograma. Adicione entradas em &quot;Gerenciar organograma&quot; ou execute as migrações
          003 e, se necessário, 004 no Supabase.
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        ...frameSx,
        borderRadius: 2,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        display: fillHeight ? 'flex' : 'block',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={
          fillHeight
            ? { flex: 1, minHeight: 0, position: 'relative' }
            : { height: '100%', minHeight: 360, position: 'relative' }
        }
      >
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.Bezier}
          defaultEdgeOptions={{
            type: 'simplebezier',
            style: { stroke: EDGE_ORG, strokeWidth: 1.25 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 12,
              height: 12,
              color: EDGE_ORG,
            },
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          colorMode={isDark ? 'dark' : 'light'}
        >
          <Background
            gap={16}
            color={isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.35)'}
            bgColor={isDark ? '#0f172a' : '#ffffff'}
          />
          <Controls
            style={{
              background: isDark ? 'rgba(15,23,42,0.9)' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.35)'}`,
              borderRadius: 8,
              boxShadow: isDark ? '0 8px 20px rgba(0,0,0,0.35)' : '0 6px 16px rgba(15,23,42,0.12)',
            }}
            className="org-flow-controls"
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
            '& .org-flow-controls .react-flow__controls-button': {
              pointerEvents: 'auto',
              color: isDark ? '#60A5FA' : '#2563EB',
              borderColor: isDark ? 'rgba(96,165,250,0.35)' : 'rgba(37,99,235,0.28)',
              backgroundColor: isDark ? 'rgba(30,41,59,0.92)' : 'rgba(255,255,255,0.95)',
              transition: 'all 0.15s ease',
            },
            '& .org-flow-controls .react-flow__controls-button:hover': {
              backgroundColor: isDark ? 'rgba(37,99,235,0.22)' : 'rgba(37,99,235,0.1)',
              color: isDark ? '#93C5FD' : '#1D4ED8',
            },
            '& .org-flow-controls .react-flow__controls-button:focus-visible': {
              outline: '2px solid',
              outlineColor: isDark ? 'rgba(96,165,250,0.55)' : 'rgba(37,99,235,0.45)',
              outlineOffset: '-1px',
            },
          }}
        />
      </Box>
    </Box>
  )
}
