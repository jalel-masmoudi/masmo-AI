import {
  ClipboardList,
  Eye,
  FileText,
  Radio,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { INVESTIGATION_WORKSPACE_HEIGHT } from '../constants/layout'
import type { InvestigationStep } from '../types/investigation'

interface TimelineViewerProps {
  steps: InvestigationStep[]
  isRunning: boolean
}

const actionMeta: Record<
  string,
  { label: string; color: string; icon: LucideIcon; border: string }
> = {
  plan: {
    label: 'Plan',
    color: 'text-accent',
    icon: ClipboardList,
    border: 'border-accent/20',
  },
  execute: {
    label: 'Execute',
    color: 'text-indigo-300',
    icon: Zap,
    border: 'border-indigo-500/20',
  },
  observe: {
    label: 'Observe',
    color: 'text-emerald-400',
    icon: Eye,
    border: 'border-success/20',
  },
  report: {
    label: 'Report',
    color: 'text-amber-300',
    icon: FileText,
    border: 'border-warning/20',
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
    <section className="panel flex flex-col p-4 sm:p-5">
      <header className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="panel-header">Timeline</h2>
          <p className="mt-0.5 truncate text-xs text-muted">
            Agent steps
            {steps.length > 0 && (
              <span className="ml-1 tabular-nums">· {steps.length}</span>
            )}
          </p>
        </div>
        {isRunning && (
          <span className="badge border-accent/30 bg-accent-muted text-accent">
            <Radio className="h-3 w-3 animate-pulse" aria-hidden />
            Live
          </span>
        )}
      </header>

      <div
        className="min-h-0 shrink-0 space-y-1.5 overflow-y-auto pr-0.5"
        style={{ height: INVESTIGATION_WORKSPACE_HEIGHT }}
      >
        {steps.length === 0 ? (
          <div className="empty-state !py-8 text-xs">
            Steps appear here as the agent investigates.
          </div>
        ) : (
          steps.map((step, index) => {
            const meta = actionMeta[step.action ?? ''] ?? {
              label: 'Step',
              color: 'text-muted',
              icon: ClipboardList,
              border: 'border-border',
            }
            const detail = formatStepDetail(step)
            const Icon = meta.icon

            return (
              <article
                key={`${step.step ?? index}-${step.action}-${step.tool ?? index}`}
                className={`rounded-lg border ${meta.border} bg-bg-elevated/80 px-3 py-2.5`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${meta.border} bg-bg-deep`}
                  >
                    <Icon className={`h-3 w-3 ${meta.color}`} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                      {step.step !== undefined && (
                        <span className="text-[10px] tabular-nums text-muted">
                          #{step.step}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-foreground">
                      {formatStepTitle(step)}
                    </h3>
                    {detail && (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
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
