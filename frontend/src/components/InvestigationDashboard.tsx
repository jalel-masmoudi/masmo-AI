import {
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Search,
  Square,
} from 'lucide-react'
import { useState } from 'react'
import { EvidencePanel } from '../evidence/EvidencePanel'
import { ExecutiveReport } from './ExecutiveReport'
import { GraphViewer } from '../graph/GraphViewer'
import { InvestigationLoader } from './InvestigationLoader'
import { useSpeechInput } from '../hooks/useSpeechInput'
import { startInvestigation } from '../services/api'
import { useInvestigationPolling } from '../services/useInvestigationPolling'
import { useReport } from '../services/useReport'
import { TimelineViewer } from '../timeline/TimelineViewer'

const DEFAULT_QUERY = 'Why is Project Phoenix delayed?'

export function InvestigationDashboard() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [investigationId, setInvestigationId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)

  const {
    isListening,
    isProcessing: isTranscribing,
    gradiumEnabled,
    toggleListening,
  } = useSpeechInput({
    onTranscript: (text) => {
      setQuery(text)
      setVoiceError(null)
    },
    onError: (message) => setVoiceError(message),
  })

  const { progress, error: pollError, isPolling } = useInvestigationPolling(
    investigationId,
  )
  const isComplete = progress?.complete ?? false
  const {
    report: reportData,
    error: reportError,
    isLoading: isReportLoading,
  } = useReport(investigationId, isComplete)

  const handleInvestigate = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await startInvestigation(trimmed)
      setInvestigationId(response.investigation_id)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to start investigation',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const status = progress?.status ?? (investigationId ? 'pending' : 'idle')
  const steps = progress?.steps ?? []
  const evidence = progress?.evidence ?? []
  const findings = progress?.findings ?? []
  const isInvestigating = isSubmitting || isPolling

  return (
    <div className="space-y-5">
      <section className="panel p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-accent" aria-hidden />
          <label
            htmlFor="investigation-query"
            className="panel-header"
          >
            Investigation command
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
          <div className="flex flex-1 gap-2">
            <input
              id="investigation-query"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Why is Project Phoenix delayed?"
              disabled={isInvestigating}
              className="input-field flex-1"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isInvestigating && query.trim()) {
                  void handleInvestigate()
                }
              }}
            />
            <button
              type="button"
              onClick={toggleListening}
              disabled={isSubmitting || isPolling || isTranscribing}
              aria-label={
                isListening ? 'Stop voice input' : 'Start voice investigation'
              }
              title={
                gradiumEnabled
                  ? 'Speak your investigation (Gradium STT)'
                  : 'Speak your investigation (browser speech recognition)'
              }
              className={`inline-flex h-[46px] min-w-[46px] items-center justify-center rounded-xl border transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                isListening
                  ? 'border-danger/40 bg-danger/10 text-red-300'
                  : 'btn-secondary !px-3'
              }`}
            >
              {isListening ? (
                <Square className="h-4 w-4 fill-current" aria-hidden />
              ) : (
                <Mic className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleInvestigate()}
            disabled={isInvestigating || !query.trim()}
            className="btn-primary min-h-[46px] min-w-[10rem]"
          >
            {isInvestigating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            {isSubmitting ? 'Starting…' : isPolling ? 'Investigating…' : 'Investigate'}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusPill status={status} />
          {investigationId && (
            <span className="text-xs text-muted">
              ID{' '}
              <code className="rounded bg-bg-elevated px-1.5 py-0.5 text-foreground/80">
                {investigationId.slice(0, 8)}…
              </code>
            </span>
          )}
          {progress?.complete && (
            <span className="badge border-success/30 bg-success/10 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              Complete
            </span>
          )}
          {steps.length > 0 && (
            <span className="text-xs tabular-nums text-muted">
              {steps.length} agent steps · {evidence.length} evidence · {findings.length} findings
            </span>
          )}
        </div>

        {(submitError || pollError || voiceError) && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-200"
          >
            {submitError || pollError || voiceError}
          </p>
        )}

        {(isListening || isTranscribing) && (
          <p
            aria-live="polite"
            className="mt-4 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-muted px-4 py-3 text-sm text-accent"
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4 animate-pulse" aria-hidden />
                Listening… speak your investigation question.
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Transcribing speech…
              </>
            )}
          </p>
        )}
      </section>

      <div className="space-y-5">
        <div className="relative min-h-[540px]">
          <InvestigationLoader
            active={isInvestigating && !isComplete}
            query={query}
            steps={steps}
          />

          <div
            className={`grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr] lg:items-start ${
              isInvestigating && !isComplete && steps.length === 0
                ? 'pointer-events-none opacity-25'
                : 'opacity-100'
            }`}
          >
            <div className="order-2 lg:order-1">
              <TimelineViewer steps={steps} isRunning={isPolling} />
            </div>
            <div className="order-1 lg:order-2">
              <GraphViewer
                investigationId={investigationId}
                isRunning={isPolling}
                isComplete={progress?.complete ?? false}
              />
            </div>
          </div>
        </div>

        <EvidencePanel
          evidence={evidence}
          findings={findings}
          isRunning={isPolling}
        />

        <ExecutiveReport
          visible={isComplete}
          reportMarkdown={reportData?.report ?? null}
          confidence={reportData?.confidence ?? progress?.confidence}
          isLoading={isReportLoading}
          error={reportError ?? undefined}
        />
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    idle: 'border-border bg-bg-elevated text-muted',
    pending: 'border-warning/30 bg-warning/10 text-amber-300',
    running: 'border-accent/30 bg-accent-muted text-accent',
    completed: 'border-success/30 bg-success/10 text-emerald-400',
    failed: 'border-danger/30 bg-danger/10 text-red-300',
  }

  return (
    <span className={`badge ${styles[status] ?? styles.idle}`}>
      {status === 'running' && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
      )}
      {status}
    </span>
  )
}
