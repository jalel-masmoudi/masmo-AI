import { useEffect, useMemo, useState } from 'react'
import {
  playExecutiveBriefing,
  stopExecutiveBriefing,
} from '../services/executiveBriefing'
import { translateReport, VOICE_LANGUAGES, type VoiceLanguageCode } from '../services/voice'
import { parseExecutiveReport } from '../types/report'

interface ExecutiveReportProps {
  reportMarkdown: string | null
  confidence?: string | null
  isLoading?: boolean
  error?: string | null
  visible: boolean
}

function renderSection(title: string, content: string, accent: string) {
  if (!content) return null

  return (
    <section className={`rounded-2xl border ${accent} bg-slate-900/50 p-5`}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {title}
      </h3>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
        {content}
      </div>
    </section>
  )
}

export function ExecutiveReport({
  reportMarkdown,
  confidence,
  isLoading = false,
  error,
  visible,
}: ExecutiveReportProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [language, setLanguage] = useState<VoiceLanguageCode>('en')
  const [translatedMarkdown, setTranslatedMarkdown] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState<string | null>(null)

  const displayMarkdown = language === 'en' ? reportMarkdown : translatedMarkdown

  const parsed = useMemo(
    () => (displayMarkdown ? parseExecutiveReport(displayMarkdown) : null),
    [displayMarkdown],
  )

  useEffect(() => {
    if (!reportMarkdown || language === 'en') {
      setTranslatedMarkdown(null)
      setTranslationError(null)
      return
    }

    let cancelled = false
    setIsTranslating(true)
    setTranslationError(null)

    void translateReport(reportMarkdown, language)
      .then((result) => {
        if (!cancelled) {
          setTranslatedMarkdown(result.report)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTranslationError(
            err instanceof Error ? err.message : 'Translation failed',
          )
          setTranslatedMarkdown(reportMarkdown)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsTranslating(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [language, reportMarkdown])

  if (!visible) {
    return null
  }

  const handlePlayBriefing = () => {
    if (!parsed) return

    void playExecutiveBriefing(parsed, language, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    })
  }

  const handleStopBriefing = () => {
    stopExecutiveBriefing({ onEnd: () => setIsSpeaking(false) })
  }

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-white/5 to-white/5 p-5 backdrop-blur-sm sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">
            Executive Briefing
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Investigation Report
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Structured conclusion for leadership review
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Briefing language
            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as VoiceLanguageCode)
              }
              className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400/40"
            >
              {VOICE_LANGUAGES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePlayBriefing}
              disabled={!parsed || isLoading || isTranslating || isSpeaking}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/15 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden>🎙</span>
              Play Executive Briefing
            </button>
            {isSpeaking && (
              <button
                type="button"
                onClick={handleStopBriefing}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </header>

      {isLoading && (
        <p className="mt-6 rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-500">
          Generating executive report...
        </p>
      )}

      {isTranslating && (
        <p className="mt-6 rounded-xl border border-dashed border-amber-500/20 px-4 py-4 text-sm text-amber-200/80">
          Translating report via Gradium multilingual pipeline...
        </p>
      )}

      {(error || translationError) && (
        <p className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error || translationError}
        </p>
      )}

      {parsed && !isLoading && (
        <div className="mt-6 space-y-4">
          {renderSection(
            'Root Cause',
            parsed.rootCause,
            'border-rose-500/20',
          )}
          {renderSection(
            'Business Impact',
            parsed.businessImpact,
            'border-sky-500/20',
          )}
          {renderSection(
            'Key Evidence & Timeline',
            parsed.evidence,
            'border-violet-500/20',
          )}
          {renderSection(
            'Recommendations',
            parsed.recommendations,
            'border-emerald-500/20',
          )}
          {(confidence || parsed.confidence) && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                Confidence Score
              </h3>
              <p className="mt-2 text-sm text-slate-200">
                {confidence || parsed.confidence}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
