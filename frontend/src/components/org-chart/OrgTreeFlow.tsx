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
import { Box, CircularProgress, Typography } from '@mui/material'
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
        >
          <Background gap={16} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </Box>
    </Box>
  )
}
