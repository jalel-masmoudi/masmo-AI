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
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
        <label
          htmlFor="investigation-query"
          className="text-sm font-medium text-slate-300"
        >
          Investigation question
        </label>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row">
          <div className="flex flex-1 gap-2">
            <input
              id="investigation-query"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Why is Project Phoenix delayed?"
              disabled={isInvestigating}
              className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
              className={`inline-flex min-w-[3rem] items-center justify-center rounded-xl border px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isListening
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                  : 'border-white/10 bg-slate-900/80 text-slate-200 hover:border-sky-500/40 hover:text-sky-200'
              }`}
            >
              <span aria-hidden>{isListening ? '■' : '🎤'}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleInvestigate()}
            disabled={isInvestigating || !query.trim()}
            className="inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isInvestigating && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950" />
            )}
            {isSubmitting ? 'Starting…' : isPolling ? 'Investigating…' : 'Investigate'}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <StatusPill status={status} />
          {investigationId && (
            <span className="text-slate-500">
              ID: <code className="text-slate-400">{investigationId}</code>
            </span>
          )}
          {progress?.complete && (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              Investigation complete
            </span>
          )}
        </div>

        {(submitError || pollError || voiceError) && (
          <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {submitError || pollError || voiceError}
          </p>
        )}

        {(isListening || isTranscribing) && (
          <p className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
            {isListening
              ? 'Listening… speak your investigation question.'
              : 'Transcribing speech…'}
          </p>
        )}
      </section>

      <div className="space-y-6">
        <div className="relative min-h-[560px]">
          <InvestigationLoader
            active={isInvestigating && !isComplete}
            query={query}
            steps={steps}
          />

          <div
            className={`grid h-full min-h-[560px] gap-6 transition-opacity duration-500 xl:grid-cols-2 ${
              isInvestigating && !isComplete && steps.length === 0
                ? 'pointer-events-none opacity-30'
                : 'opacity-100'
            }`}
          >
            <TimelineViewer steps={steps} isRunning={isPolling} />
            <GraphViewer
              investigationId={investigationId}
              isRunning={isPolling}
              isComplete={progress?.complete ?? false}
            />
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
    idle: 'border-slate-700 bg-slate-800 text-slate-400',
    pending: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    running: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    completed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    failed: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  }

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${styles[status] ?? styles.idle}`}
    >
      {status}
    </span>
  )
}
