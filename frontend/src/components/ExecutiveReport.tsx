import {
  AlertTriangle,
  BarChart3,
  FileText,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Target,
} from 'lucide-react'
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

const SECTIONS = [
  { key: 'rootCause' as const, title: 'Root Cause', icon: Target, accent: 'border-danger/25' },
  { key: 'businessImpact' as const, title: 'Business Impact', icon: BarChart3, accent: 'border-accent/25' },
  { key: 'evidence' as const, title: 'Key Evidence & Timeline', icon: FileText, accent: 'border-indigo-500/25' },
  { key: 'recommendations' as const, title: 'Recommendations', icon: Sparkles, accent: 'border-success/25' },
]

export function ExecutiveReport({
  reportMarkdown,
  confidence,
  isLoading = false,
  error,
  visible,
}: ExecutiveReportProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
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

  useEffect(() => {
    return () => {
      stopExecutiveBriefing({
        onEnd: () => {
          setIsSpeaking(false)
          setIsAudioLoading(false)
        },
      })
    }
  }, [language, reportMarkdown])

  if (!visible) {
    return null
  }

  const handlePlayBriefing = () => {
    if (!parsed) return

    setIsAudioLoading(true)
    void playExecutiveBriefing(parsed, language, {
      onStart: () => {
        setIsSpeaking(true)
        setIsAudioLoading(false)
      },
      onEnd: () => {
        setIsSpeaking(false)
        setIsAudioLoading(false)
      },
      onError: () => {
        setIsSpeaking(false)
        setIsAudioLoading(false)
      },
    })
  }

  const handleStopBriefing = () => {
    stopExecutiveBriefing({
      onEnd: () => {
        setIsSpeaking(false)
        setIsAudioLoading(false)
      },
    })
  }

  return (
    <section className="panel relative overflow-hidden p-5 sm:p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
        aria-hidden
      />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="panel-header text-warning">Executive Briefing</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">
            Investigation Report
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Structured conclusion for leadership review
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            Briefing language
            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as VoiceLanguageCode)
              }
              className="input-field !py-2 text-sm"
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
              disabled={
                !parsed ||
                isLoading ||
                isTranslating ||
                isSpeaking ||
                isAudioLoading
              }
              className="btn-primary !py-2.5 min-w-[200px]"
            >
              {isAudioLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              {isAudioLoading ? 'Synthesizing...' : 'Play Executive Briefing'}
            </button>
            {(isSpeaking || isAudioLoading) && (
              <button
                type="button"
                onClick={handleStopBriefing}
                className="btn-secondary !py-2.5"
              >
                <Pause className="h-4 w-4" aria-hidden />
                Stop
              </button>
            )}
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="mt-6 flex items-center gap-3 empty-state">
          <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden />
          Generating executive report…
        </div>
      )}

      {isTranslating && (
        <p
          aria-live="polite"
          className="mt-6 flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-amber-200"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Translating report via Gradium multilingual pipeline…
        </p>
      )}

      {(error || translationError) && (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error || translationError}
        </p>
      )}

      {parsed && !isLoading && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {SECTIONS.map(({ key, title, icon: Icon, accent }) => {
            const content = parsed[key]
            if (!content) return null

            return (
              <section
                key={key}
                className={`rounded-xl border ${accent} bg-bg-elevated/60 p-5 lg:last:odd:col-span-2`}
              >
                <h3 className="flex items-center gap-2 panel-header !tracking-[0.15em]">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {title}
                </h3>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {content}
                </div>
              </section>
            )
          })}

          {(confidence || parsed.confidence) && (
            <div className="rounded-xl border border-warning/25 bg-warning/5 p-5 lg:col-span-2">
              <h3 className="panel-header text-warning">Confidence Score</h3>
              <p className="mt-2 text-sm text-foreground/90">
                {confidence || parsed.confidence}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
