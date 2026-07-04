import { Maximize2, Minimize2, Network } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { getGraph } from '../services/api'
import type { GraphState } from '../types/graph'
import { EnterpriseNode } from './EnterpriseNode'
import { mapGraphToFlow } from './mapGraphData'

import { INVESTIGATION_WORKSPACE_HEIGHT } from '../constants/layout'

const nodeTypes = { enterprise: EnterpriseNode }

interface GraphViewerProps {
  investigationId: string | null
  isRunning: boolean
  isComplete?: boolean
}

const emptyGraph: GraphState = { nodes: [], edges: [] }

function FitViewOnChange({ nodes }: { nodes: Node[] }) {
  const { fitView } = useReactFlow()

  useEffect(() => {
    if (nodes.length === 0) return

    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 200 })
    }, 50)

    return () => window.clearTimeout(timer)
  }, [nodes, fitView])

  return null
}

function GraphCanvas({
  nodes,
  edges,
}: {
  nodes: Node[]
  edges: Edge[]
}) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
      className="graph-flow"
    >
      <FitViewOnChange nodes={nodes} />
      <Background color="#1e293b" gap={20} size={1} />
      <MiniMap
        nodeColor={(node) => {
          const type = node.data?.nodeType as string | undefined
          if (type === 'incident') return '#ef4444'
          if (type === 'project') return '#5e6ad2'
          if (type === 'ticket') return '#8b5cf6'
          if (type === 'system') return '#06b6d4'
          return '#64748b'
        }}
        maskColor="rgba(2, 2, 3, 0.85)"
        className="!rounded-lg !border !border-border !bg-bg-elevated"
      />
      <Controls className="graph-controls" />
    </ReactFlow>
  )
}

export function GraphViewer({
  investigationId,
  isRunning,
  isComplete = false,
}: GraphViewerProps) {
  const [graphState, setGraphState] = useState<GraphState>(emptyGraph)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen()
      } else {
        await container.requestFullscreen()
      }
    } catch {
      // Fullscreen may be blocked by browser policy.
    }
  }

  useEffect(() => {
    if (!investigationId) {
      setGraphState(emptyGraph)
      setError(null)
      return
    }

    let cancelled = false
    let intervalId: number | undefined

    const fetchGraph = async () => {
      try {
        const response = await getGraph(investigationId)
        if (cancelled) return
        setGraphState(response.graph_state)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load graph')
      }
    }

    void fetchGraph()
    if (!isComplete) {
      intervalId = window.setInterval(() => {
        void fetchGraph()
      }, 800)
    }

    return () => {
      cancelled = true
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [investigationId, isComplete])

  const { nodes, edges } = useMemo(() => mapGraphToFlow(graphState), [graphState])

  const canvasHeight = isFullscreen
    ? 'min(720px, calc(100vh - 12rem))'
    : `${INVESTIGATION_WORKSPACE_HEIGHT}px`

  return (
    <section
      ref={containerRef}
      className={`panel flex flex-col p-4 sm:p-5 ${
        isFullscreen ? 'bg-bg-deep' : ''
      }`}
    >
      <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div>
          <h2 className="panel-header flex items-center gap-2">
            <Network className="h-3.5 w-3.5 text-accent" aria-hidden />
            Knowledge Graph
          </h2>
          <p className="mt-1 text-sm text-muted">
            Enterprise dependencies discovered during investigation
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-right text-xs tabular-nums text-muted">
            <p>{graphState.nodes.length} nodes</p>
            <p>{graphState.edges.length} edges</p>
          </div>
          {nodes.length > 0 && (
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="btn-secondary !px-3 !py-2 text-xs"
              aria-label={
                isFullscreen ? 'Exit full screen graph' : 'View graph full screen'
              }
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                  Exit
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                  Full screen
                </>
              )}
            </button>
          )}
        </div>
      </header>

      <div
        className="graph-canvas relative shrink-0 overflow-hidden rounded-xl border border-border bg-bg-deep"
        style={{ height: canvasHeight }}
      >
        {error ? (
          <div className="flex h-full items-center justify-center px-6 text-sm text-red-300">
            {error}
          </div>
        ) : nodes.length === 0 ? (
          <div className="empty-state flex h-full items-center justify-center border-0">
            {investigationId
              ? isRunning
                ? 'Building dependency graph as the agent investigates…'
                : 'No graph data available yet.'
              : 'Start an investigation to visualize enterprise dependencies.'}
          </div>
        ) : (
          <ReactFlowProvider>
            <GraphCanvas nodes={nodes} edges={edges} />
          </ReactFlowProvider>
        )}
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap gap-4 text-[11px] text-muted">
        <LegendItem color="bg-accent/40 border-accent/60" label="Project" />
        <LegendItem color="bg-red-500/30 border-red-500/50" label="Incident" />
        <LegendItem color="bg-violet-500/30 border-violet-500/50" label="Ticket" />
        <LegendItem color="bg-cyan-500/30 border-cyan-500/50" label="System" />
        <LegendItem color="rounded-full bg-slate-500/30 border-slate-500/50" label="Employee" />
      </div>
    </section>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 border ${color}`} aria-hidden />
      {label}
    </span>
  )
}
