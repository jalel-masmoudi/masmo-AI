import { buildBriefingScript, type ParsedReport } from '../types/report'
import { synthesizeSpeech, type VoiceLanguageCode } from './voice'

const GRADIUM_EVENT = 'gradium:executive_briefing'
const isDev = import.meta.env.DEV

let currentAudio: HTMLAudioElement | null = null
let currentObjectUrl: string | null = null

export interface BriefingCallbacks {
  onStart?: () => void
  onEnd?: () => void
  onError?: (message: string) => void
}

function logGradiumEvent(event: string, payload?: Record<string, unknown>) {
  if (isDev) {
    console.log(`[${GRADIUM_EVENT}]`, { event, ...payload })
  }
}

function cleanupAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

function playBrowserTts(
  script: string,
  callbacks?: BriefingCallbacks,
): boolean {
  if (!('speechSynthesis' in window)) {
    return false
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(script)
  utterance.rate = 0.92
  utterance.pitch = 1
  utterance.onstart = () => callbacks?.onStart?.()
  utterance.onend = () => {
    logGradiumEvent('executive_briefing_completed', { provider: 'browser-tts' })
    callbacks?.onEnd?.()
  }
  utterance.onerror = () => {
    const message = 'Speech synthesis failed.'
    logGradiumEvent('executive_briefing_error', { message })
    callbacks?.onError?.(message)
  }

  window.speechSynthesis.resume()
  window.speechSynthesis.speak(utterance)
  return true
}

export async function playExecutiveBriefing(
  report: ParsedReport,
  language: VoiceLanguageCode = 'en',
  callbacks?: BriefingCallbacks,
): Promise<void> {
  const script = buildBriefingScript(report, language)

  logGradiumEvent('executive_briefing_started', {
    provider: 'gradium',
    language,
    script,
  })

  cleanupAudio()

  try {
    const audioBlob = await synthesizeSpeech(script, language)
    const objectUrl = URL.createObjectURL(audioBlob)
    currentObjectUrl = objectUrl

    const audio = new Audio(objectUrl)
    currentAudio = audio
    audio.onplay = () => callbacks?.onStart?.()
    audio.onended = () => {
      logGradiumEvent('executive_briefing_completed', { provider: 'gradium' })
      cleanupAudio()
      callbacks?.onEnd?.()
    }
    audio.onerror = () => {
      cleanupAudio()
      if (!playBrowserTts(script, callbacks)) {
        const message = 'Gradium playback failed and browser TTS is unavailable.'
        logGradiumEvent('executive_briefing_error', { message })
        callbacks?.onError?.(message)
      }
    }

    await audio.play()
  } catch (error) {
    logGradiumEvent('executive_briefing_fallback', {
      reason: error instanceof Error ? error.message : 'unknown',
    })

    if (!playBrowserTts(script, callbacks)) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gradium TTS is unavailable in this environment.'
      logGradiumEvent('executive_briefing_error', { message })
      callbacks?.onError?.(message)
    }
  }
}

export function stopExecutiveBriefing(callbacks?: Pick<BriefingCallbacks, 'onEnd'>) {
  cleanupAudio()
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  logGradiumEvent('executive_briefing_stopped')
  callbacks?.onEnd?.()
}
