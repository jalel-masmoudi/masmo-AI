import { useEffect, useRef, useState } from 'react'
import { getInvestigation } from '../services/api'
import type { InvestigationProgress } from '../types/investigation'

const POLL_INTERVAL_MS = 800

export function useInvestigationPolling(investigationId: string | null) {
  const [progress, setProgress] = useState<InvestigationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const progressRef = useRef<InvestigationProgress | null>(null)

  useEffect(() => {
    if (!investigationId) {
      setProgress(null)
      setError(null)
      setIsPolling(false)
      progressRef.current = null
      return
    }

    let cancelled = false
    let intervalId: number | undefined

    const poll = async () => {
      try {
        const data = await getInvestigation(investigationId)
        if (cancelled) return

        progressRef.current = data
        setProgress(data)
        setError(data.error ?? null)
        setIsPolling(!data.complete)

        if (data.complete && intervalId) {
          window.clearInterval(intervalId)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to fetch investigation')
        setIsPolling(false)
        if (intervalId) window.clearInterval(intervalId)
      }
    }

    setIsPolling(true)
    void poll()
    intervalId = window.setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [investigationId])

  return { progress, error, isPolling }
}
