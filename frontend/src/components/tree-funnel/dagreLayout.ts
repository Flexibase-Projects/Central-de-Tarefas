import dagre from 'dagre'
import type { Edge, Node } from '@xyflow/react'

/** Dimensões aproximadas do card no React Flow (organograma + custos por dept). */
const NODE_WIDTH = 240
const NODE_HEIGHT = 120

/** Layout top-down (TB) para React Flow */
export function layoutWithDagre(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 72, marginx: 24, marginy: 24 })
  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target)
  }
  dagre.layout(g)
  return nodes.map((n) => {
    const pos = g.node(n.id)
    if (!pos) return { ...n, position: n.position ?? { x: 0, y: 0 } }
    return {
      ...n,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })
}
