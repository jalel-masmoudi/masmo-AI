import type { VoiceLanguageCode } from '../services/voice'

export interface ReportResponse {
  investigation_id: string
  status: string
  ready: boolean
  report: string | null
  confidence: string | null
}

export interface ParsedReport {
  rootCause: string
  businessImpact: string
  evidence: string
  recommendations: string
  confidence: string
  raw: string
}

export function parseExecutiveReport(markdown: string): ParsedReport {
  const sections: Record<string, string> = {}

  const body = markdown.replace(/^# Executive Investigation Report\s*/m, '')
  const parts = body.split(/^## /m).filter(Boolean)

  for (const part of parts) {
    const newlineIndex = part.indexOf('\n')
    const title = (newlineIndex === -1 ? part : part.slice(0, newlineIndex)).trim()
    const content = (newlineIndex === -1 ? '' : part.slice(newlineIndex + 1)).trim()
    sections[title.toLowerCase()] = content
  }

  return {
    rootCause: sections['root cause'] ?? '',
    businessImpact: sections['business impact'] ?? '',
    evidence: sections['key evidence & timeline'] ?? '',
    recommendations: sections['recommendations'] ?? '',
    confidence: sections['confidence score'] ?? '',
    raw: markdown,
  }
}

export function buildBriefingScript(
  report: ParsedReport,
  language: VoiceLanguageCode = 'en',
): string {
  const recommendationLine = report.recommendations
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)[0]

  const intros: Record<VoiceLanguageCode, string> = {
    en: 'Executive Briefing.',
    fr: 'Briefing exécutif.',
    de: 'Executive Briefing.',
    es: 'Informe ejecutivo.',
    pt: 'Briefing executivo.',
  }

  const recommendationLabels: Record<VoiceLanguageCode, string> = {
    en: 'Recommendation',
    fr: 'Recommandation',
    de: 'Empfehlung',
    es: 'Recomendación',
    pt: 'Recomendação',
  }

  return [
    intros[language],
    report.rootCause,
    report.businessImpact,
    recommendationLine
      ? `${recommendationLabels[language]}: ${recommendationLine}`
      : '',
  ]
    .filter(Boolean)
    .join(' ')
}
