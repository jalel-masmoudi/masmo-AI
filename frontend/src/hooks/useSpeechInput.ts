import { useCallback, useEffect, useRef, useState } from 'react'
import { getVoiceStatus, transcribeAudio } from '../services/voice'

interface UseSpeechInputOptions {
  onTranscript: (text: string) => void
  onError?: (message: string) => void
}

interface BrowserSpeechRecognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type BrowserSpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

async function recordingToWav(blob: Blob): Promise<Blob> {
  if (blob.type.includes('wav')) {
    return blob
  }

  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer())
    const channelData = audioBuffer.getChannelData(0)
    return encodeWav(channelData, audioBuffer.sampleRate)
  } finally {
    await audioContext.close()
  }
}

function getSpeechRecognitionCtor():
  | (new () => BrowserSpeechRecognition)
  | undefined {
  const browserWindow = window as BrowserSpeechWindow
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition
}

export function useSpeechInput({ onTranscript, onError }: UseSpeechInputOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [gradiumEnabled, setGradiumEnabled] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)

  useEffect(() => {
    void getVoiceStatus()
      .then((status) => setGradiumEnabled(status.gradium_configured))
      .catch(() => setGradiumEnabled(false))
  }, [])

  const stopMediaCapture = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    stopMediaCapture()
    setIsListening(false)
  }, [stopMediaCapture])

  const startBrowserRecognition = useCallback(() => {
    const RecognitionCtor = getSpeechRecognitionCtor()
    if (!RecognitionCtor) {
      onError?.('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new RecognitionCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()
      if (transcript) {
        onTranscript(transcript)
      } else {
        onError?.('No speech detected.')
      }
      setIsListening(false)
      setIsProcessing(false)
    }

    recognition.onerror = () => {
      onError?.('Speech recognition failed.')
      setIsListening(false)
      setIsProcessing(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setIsProcessing(false)
    }

    setIsListening(true)
    recognition.start()
  }, [onError, onTranscript])

  const startGradiumCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      chunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        void (async () => {
          setIsProcessing(true)
          try {
            const recorded = new Blob(chunksRef.current, { type: mimeType })
            const wavBlob = await recordingToWav(recorded)
            const transcript = await transcribeAudio(wavBlob, 'audio/wav')
            onTranscript(transcript)
          } catch (error) {
            onError?.(
              error instanceof Error ? error.message : 'Voice transcription failed.',
            )
          } finally {
            setIsListening(false)
            setIsProcessing(false)
            chunksRef.current = []
          }
        })()
      }

      recorder.start()
      setIsListening(true)
    } catch {
      onError?.('Microphone access was denied.')
      setIsListening(false)
    }
  }, [onError, onTranscript])

  const toggleListening = useCallback(() => {
    if (isListening || isProcessing) {
      stopListening()
      return
    }

    if (gradiumEnabled) {
      void startGradiumCapture()
      return
    }

    startBrowserRecognition()
  }, [
    gradiumEnabled,
    isListening,
    isProcessing,
    startBrowserRecognition,
    startGradiumCapture,
    stopListening,
  ])

  useEffect(() => () => stopListening(), [stopListening])

  return {
    isListening,
    isProcessing,
    gradiumEnabled,
    toggleListening,
    stopListening,
  }
}
