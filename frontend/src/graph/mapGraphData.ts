import type { Edge, Node } from 'reactflow'
import { MarkerType } from 'reactflow'
import dagre from 'dagre'
import type { GraphState } from '../types/graph'

const nodeWidth = 180;
const nodeHeight = 80;

function nodeLabel(node: GraphState['nodes'][number]): string {
  return node.title || node.name || node.id
}

export function mapGraphToFlow(graph: GraphState): {
  nodes: Node[]
  edges: Edge[]
} {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: 'LR', align: 'UL', ranksep: 100, nodesep: 60 })

  const nodes: Node[] = graph.nodes.map((node) => ({
    id: node.id,
    type: 'enterprise',
    position: { x: 0, y: 0 },
    data: {
      label: nodeLabel(node),
      nodeType: node.node_type ?? 'unknown',
      status: node.status,
    },
  }))

  const edges: Edge[] = graph.edges.map((edge, index) => ({
    id: `${edge.source}-${edge.target}-${edge.relation ?? index}`,
    source: edge.source,
    target: edge.target,
    label: edge.relation,
    animated: edge.relation === 'blocked_by' || edge.relation === 'affects',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color:
        edge.relation === 'blocked_by'
          ? '#f87171'
          : edge.relation === 'affects'
            ? '#fb7185'
            : edge.relation === 'depends_on'
              ? '#38bdf8'
              : '#94a3b8',
    },
    style: {
      strokeWidth: 2,
      stroke:
        edge.relation === 'blocked_by'
          ? '#f87171'
          : edge.relation === 'affects'
            ? '#fb7185'
            : edge.relation === 'depends_on'
              ? '#38bdf8'
              : '#94a3b8',
    },
    labelStyle: { fill: '#cbd5e1', fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  }))

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const positionedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }
  })

  return { nodes: positionedNodes, edges }
}
