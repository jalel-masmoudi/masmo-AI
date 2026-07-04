import { BrainCircuit, Loader2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { InvestigationStep } from '../types/investigation'

const BOOT_MESSAGES = [
  'Initializing investigation agent…',
  'Planning multi-step analysis…',
  'Connecting to enterprise data silos…',
  'Preparing knowledge graph engine…',
]

const ACTION_LABELS: Record<string, string> = {
  plan: 'Planning next investigation step…',
  execute: 'Executing enterprise tool…',
  observe: 'Analyzing evidence and updating graph…',
  report: 'Generating executive report…',
}

const PHASES = ['Plan', 'Execute', 'Observe', 'Report'] as const

interface InvestigationLoaderProps {
  active: boolean
  query: string
  steps: InvestigationStep[]
}

export function InvestigationLoader({
  active,
  query,
  steps,
}: InvestigationLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [canDismiss, setCanDismiss] = useState(false)

  const latestStep = steps[steps.length - 1]
  const progress = Math.min(100, Math.round((steps.length / 25) * 100))

  const statusMessage = useMemo(() => {
    if (latestStep?.action === 'execute' && latestStep.tool) {
      return `Running ${latestStep.tool.replace(/_/g, ' ')}…`
    }
    if (latestStep?.action && ACTION_LABELS[latestStep.action]) {
      return ACTION_LABELS[latestStep.action]
    }
    return BOOT_MESSAGES[messageIndex]
  }, [latestStep, messageIndex])

  useEffect(() => {
    if (!active) {
      setVisible(false)
      setCanDismiss(false)
      setMessageIndex(0)
      return
    }

    setVisible(true)
    setCanDismiss(false)

    const dismissTimer = window.setTimeout(() => setCanDismiss(true), 1200)
    const intervalId = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % BOOT_MESSAGES.length)
    }, 1400)

    return () => {
      window.clearTimeout(dismissTimer)
      window.clearInterval(intervalId)
    }
  }, [active])

  useEffect(() => {
    if (!active || !canDismiss || steps.length === 0) return

    const timer = window.setTimeout(() => setVisible(false), 500)
    return () => window.clearTimeout(timer)
  }, [active, canDismiss, steps.length])

  if (!active || !visible) return null

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-[var(--radius-panel)] bg-bg-deep/80 p-6 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-label="Investigation in progress"
    >
      <div className="panel w-full max-w-md p-8 shadow-[0_0_48px_var(--color-accent-glow)]">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-accent/10" />
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/15" />
            <BrainCircuit className="relative h-8 w-8 text-accent" aria-hidden />
          </div>

          <p className="panel-header text-accent">Investigation in progress</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Analyzing your question
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted">
            &ldquo;{query}&rdquo;
          </p>

          <p className="mt-5 flex min-h-[1.5rem] items-center justify-center gap-2 text-sm font-medium text-foreground/90">
            {steps.length === 0 && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" aria-hidden />
            )}
            {statusMessage}
          </p>

          <div className="mt-6 w-full">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>Agent progress</span>
              <span className="tabular-nums">
                {steps.length > 0 ? `${progress}%` : 'Starting…'}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-elevated">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-indigo-600 to-accent transition-all duration-500 ${
                  steps.length === 0 ? 'w-1/3 animate-pulse' : ''
                }`}
                style={
                  steps.length > 0
                    ? { width: `${Math.max(progress, 8)}%` }
                    : undefined
                }
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {PHASES.map((phase) => {
              const phaseKey = phase.toLowerCase()
              const isActive =
                latestStep?.action === phaseKey ||
                (phase === 'Plan' && steps.length === 0)
              const isDone =
                steps.some((step) => step.action === phaseKey) &&
                latestStep?.action !== phaseKey

              return (
                <span
                  key={phase}
                  className={`badge transition-colors duration-200 ${
                    isActive
                      ? 'border-accent/40 bg-accent-muted text-accent'
                      : isDone
                        ? 'border-success/30 bg-success/10 text-emerald-400'
                        : 'border-border bg-bg-elevated text-muted'
                  }`}
                >
                  {phase}
                </span>
              )
            })}
          </div>

          <p className="mt-5 flex items-center gap-1.5 text-xs text-muted">
            <Search className="h-3 w-3" aria-hidden />
            Multi-agent workflow active
          </p>
        </div>
      </div>
    </div>
  )
}
