import type { InvestigationStep } from '../types/investigation'

interface TimelineViewerProps {
  steps: InvestigationStep[]
  isRunning: boolean
}

const actionMeta: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  plan: {
    label: 'Plan',
    color: 'text-sky-300',
    dot: 'bg-sky-400',
  },
  execute: {
    label: 'Execute',
    color: 'text-violet-300',
    dot: 'bg-violet-400',
  },
  observe: {
    label: 'Observe',
    color: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  report: {
    label: 'Report',
    color: 'text-amber-300',
    dot: 'bg-amber-400',
  },
}

function formatStepTitle(step: InvestigationStep): string {
  if (step.action === 'plan' && step.decision === 'report') {
    return 'Planner decided sufficient evidence gathered'
  }
  if (step.action === 'plan' && step.tool) {
    return `Planner selected ${step.tool}`
  }
  if (step.action === 'execute' && step.tool) {
    return `Executed ${step.tool}`
  }
  if (step.action === 'observe' && step.tool) {
    return `Processed output from ${step.tool}`
  }
  if (step.action === 'report') {
    return 'Executive report generated'
  }
  return step.action ?? 'Step'
}

function formatStepDetail(step: InvestigationStep): string | null {
  if (step.reasoning) return step.reasoning
  if (step.args && Object.keys(step.args).length > 0) {
    return JSON.stringify(step.args)
  }
  if (step.result_count !== undefined) {
    return `Returned ${step.result_count} result(s)`
  }
  if (step.findings_added !== undefined || step.evidence_added !== undefined) {
    return `Added ${step.findings_added ?? 0} finding(s), ${step.evidence_added ?? 0} evidence item(s)`
  }
  if (step.confidence) return step.confidence
  if (step.error) return step.error
  return null
}

export function TimelineViewer({ steps, isRunning }: TimelineViewerProps) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Investigation Timeline
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Agent reasoning steps in real time
          </p>
        </div>
        {isRunning && (
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
            Live
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {steps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
            Start an investigation to see the agent plan, execute tools, and observe
            evidence.
          </div>
        ) : (
          steps.map((step, index) => {
            const meta = actionMeta[step.action ?? ''] ?? {
              label: 'Step',
              color: 'text-slate-300',
              dot: 'bg-slate-400',
            }
            const detail = formatStepDetail(step)

            return (
              <article
                key={`${step.step ?? index}-${step.action}-${step.tool ?? index}`}
                className="relative rounded-xl border border-white/8 bg-slate-900/70 p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                      {step.step !== undefined && (
                        <span className="text-xs text-slate-600">#{step.step}</span>
                      )}
                    </div>
                    <h3 className="mt-1 text-sm font-medium text-slate-100">
                      {formatStepTitle(step)}
                    </h3>
                    {detail && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {detail}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
