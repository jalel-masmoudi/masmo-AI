import { buildBriefingScript, type ParsedReport } from '../types/report'
import { synthesizeSpeech, type VoiceLanguageCode } from './voice'

const GRADIUM_EVENT = 'gradium:executive_briefing'
const isDev = import.meta.env.DEV

let currentAudio: HTMLAudioElement | null = null
let currentObjectUrl: string | null = null
let currentRequestId = 0

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
  requestId?: number,
): boolean {
  if (!('speechSynthesis' in window)) {
    return false
  }

  window.speechSynthesis.cancel()

  if (requestId !== undefined && requestId !== currentRequestId) {
    return true
  }

  const utterance = new SpeechSynthesisUtterance(script)
  utterance.rate = 0.92
  utterance.pitch = 1
  utterance.onstart = () => {
    if (requestId === undefined || requestId === currentRequestId) {
      callbacks?.onStart?.()
    } else {
      window.speechSynthesis.cancel()
    }
  }
  utterance.onend = () => {
    if (requestId === undefined || requestId === currentRequestId) {
      logGradiumEvent('executive_briefing_completed', { provider: 'browser-tts' })
      callbacks?.onEnd?.()
    }
  }
  utterance.onerror = () => {
    if (requestId === undefined || requestId === currentRequestId) {
      const message = 'Speech synthesis failed.'
      logGradiumEvent('executive_briefing_error', { message })
      callbacks?.onError?.(message)
    }
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
  const requestId = ++currentRequestId
  const script = buildBriefingScript(report, language)

  logGradiumEvent('executive_briefing_started', {
    provider: 'gradium',
    language,
    script,
    requestId,
  })

  cleanupAudio()

  try {
    const audioBlob = await synthesizeSpeech(script, language)
    
    if (requestId !== currentRequestId) {
      return
    }

    const objectUrl = URL.createObjectURL(audioBlob)
    currentObjectUrl = objectUrl

    const audio = new Audio(objectUrl)
    currentAudio = audio
    
    audio.onplay = () => {
      if (requestId === currentRequestId) {
        callbacks?.onStart?.()
      } else {
        audio.pause()
      }
    }
    
    audio.onended = () => {
      if (requestId === currentRequestId) {
        logGradiumEvent('executive_briefing_completed', { provider: 'gradium' })
        cleanupAudio()
        callbacks?.onEnd?.()
      }
    }
    
    audio.onerror = () => {
      cleanupAudio()
      if (requestId !== currentRequestId) {
        return
      }
      if (!playBrowserTts(script, callbacks, requestId)) {
        const message = 'Gradium playback failed and browser TTS is unavailable.'
        logGradiumEvent('executive_briefing_error', { message })
        callbacks?.onError?.(message)
      }
    }

    if (requestId === currentRequestId) {
      await audio.play()
    }
  } catch (error) {
    if (requestId !== currentRequestId) {
      return
    }
    
    logGradiumEvent('executive_briefing_fallback', {
      reason: error instanceof Error ? error.message : 'unknown',
    })

    if (!playBrowserTts(script, callbacks, requestId)) {
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
  currentRequestId++
  cleanupAudio()
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  logGradiumEvent('executive_briefing_stopped')
  callbacks?.onEnd?.()
}
