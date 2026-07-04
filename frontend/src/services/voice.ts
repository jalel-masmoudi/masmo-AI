export type VoiceLanguageCode = 'en' | 'fr' | 'de' | 'es' | 'pt'

export interface VoiceLanguage {
  code: VoiceLanguageCode
  label: string
}

export interface VoiceStatusResponse {
  gradium_configured: boolean
  languages: VoiceLanguage[]
}

export interface TranslateReportResponse {
  language: VoiceLanguageCode
  report: string
  provider: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt', label: 'Portuguese' },
]

export async function getVoiceStatus(): Promise<VoiceStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/voice/status`)
  if (!response.ok) {
    throw new Error('Failed to load voice status')
  }
  return response.json() as Promise<VoiceStatusResponse>
}

export async function transcribeAudio(blob: Blob, contentType: string): Promise<string> {
  const formData = new FormData()
  formData.append('audio', blob, contentType.includes('wav') ? 'recording.wav' : 'recording.webm')
  formData.append('content_type', contentType)

  const response = await fetch(`${API_BASE_URL}/voice/stt`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `STT failed: ${response.status}`)
  }

  const payload = (await response.json()) as { transcript: string }
  return payload.transcript
}

export async function synthesizeSpeech(
  text: string,
  language: VoiceLanguageCode,
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/voice/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `TTS failed: ${response.status}`)
  }

  return response.blob()
}

export async function translateReport(
  report: string,
  language: VoiceLanguageCode,
): Promise<TranslateReportResponse> {
  const response = await fetch(`${API_BASE_URL}/voice/translate-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report, language }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Translation failed: ${response.status}`)
  }

  return response.json() as Promise<TranslateReportResponse>
}
