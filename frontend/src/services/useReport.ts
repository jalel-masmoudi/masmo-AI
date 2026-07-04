import { useEffect, useState } from 'react'
import { getReport } from '../services/api'
import type { ReportResponse } from '../types/report'

export function useReport(investigationId: string | null, isComplete: boolean) {
  const [report, setReport] = useState<ReportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!investigationId || !isComplete) {
      setReport(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    const fetchReport = async () => {
      try {
        const response = await getReport(investigationId)
        if (cancelled) return
        setReport(response)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchReport()

    return () => {
      cancelled = true
    }
  }, [investigationId, isComplete])

  return { report, error, isLoading }
}
