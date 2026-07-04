import { useEffect, useMemo, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'
import { getGraph } from '../services/api'
import type { GraphState } from '../types/graph'
import { EnterpriseNode } from './EnterpriseNode'
import { mapGraphToFlow } from './mapGraphData'

const nodeTypes = { enterprise: EnterpriseNode }

interface GraphViewerProps {
  investigationId: string | null
  isRunning: boolean
  isComplete?: boolean
}

const emptyGraph: GraphState = { nodes: [], edges: [] }

export function GraphViewer({
  investigationId,
  isRunning,
  isComplete = false,
}: GraphViewerProps) {
  const [graphState, setGraphState] = useState<GraphState>(emptyGraph)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <section className="flex h-full min-h-[560px] flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Knowledge Graph
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enterprise dependencies discovered during investigation
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>{graphState.nodes.length} nodes</p>
          <p>{graphState.edges.length} edges</p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80">
        {error ? (
          <div className="flex h-full items-center justify-center px-6 text-sm text-rose-300">
            {error}
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
            {investigationId
              ? isRunning
                ? 'Building dependency graph as the agent investigates...'
                : 'No graph data available yet.'
              : 'Start an investigation to visualize enterprise dependencies.'}
          </div>
        ) : (
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
          >
            <Background color="#334155" gap={18} />
            <MiniMap
              nodeColor={(node) => {
                const type = node.data?.nodeType as string | undefined
                if (type === 'incident') return '#f43f5e'
                if (type === 'project') return '#0ea5e9'
                if (type === 'ticket') return '#8b5cf6'
                if (type === 'system') return '#06b6d4'
                return '#64748b'
              }}
              maskColor="rgba(2, 6, 23, 0.75)"
            />
            <Controls />
          </ReactFlow>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
        <LegendItem color="bg-sky-500/30 border-sky-500/50" label="Project" />
        <LegendItem color="bg-rose-500/30 border-rose-500/50" label="Incident" />
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
      <span className={`h-3 w-3 border ${color}`} />
      {label}
    </span>
  )
}
