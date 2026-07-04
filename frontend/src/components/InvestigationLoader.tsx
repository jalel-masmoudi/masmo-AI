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
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-950/75 p-6 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-sky-500/20 bg-slate-900/90 p-8 shadow-2xl shadow-sky-950/30">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6 h-16 w-16">
            <span className="absolute inset-0 animate-ping rounded-full bg-sky-500/20" />
            <span className="absolute inset-2 animate-spin rounded-full border-2 border-sky-500/20 border-t-sky-400" />
            <span className="absolute inset-0 flex items-center justify-center text-lg">
              🔍
            </span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-400">
            Investigation in progress
          </p>
          <h3 className="mt-3 text-xl font-semibold text-white">
            Analyzing your question
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-slate-400">
            &ldquo;{query}&rdquo;
          </p>

          <p className="mt-6 min-h-[1.5rem] text-sm font-medium text-sky-200 transition-opacity duration-300">
            {statusMessage}
          </p>

          <div className="mt-6 w-full">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>Agent progress</span>
              <span>{steps.length > 0 ? `${progress}%` : 'Starting…'}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500 ${
                  steps.length === 0 ? 'w-1/3 animate-pulse' : ''
                }`}
                style={steps.length > 0 ? { width: `${Math.max(progress, 8)}%` } : undefined}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['Plan', 'Execute', 'Observe', 'Report'].map((phase) => {
              const isActive =
                latestStep?.action === phase.toLowerCase() ||
                (phase === 'Plan' && steps.length === 0)
              const isDone =
                steps.some((step) => step.action === phase.toLowerCase()) &&
                latestStep?.action !== phase.toLowerCase()

              return (
                <span
                  key={phase}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-sky-400/40 bg-sky-500/15 text-sky-200'
                      : isDone
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-slate-800/80 text-slate-500'
                  }`}
                >
                  {phase}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
