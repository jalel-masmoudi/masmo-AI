import type {
  InvestigateResponse,
  InvestigationProgress,
} from '../types/investigation'
import type { GraphResponse } from '../types/graph'
import type { ReportResponse } from '../types/report'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function startInvestigation(query: string): Promise<InvestigateResponse> {
  return request<InvestigateResponse>('/investigate', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
}

export function getInvestigation(
  investigationId: string,
): Promise<InvestigationProgress> {
  return request<InvestigationProgress>(`/investigation/${investigationId}`)
}

export function getGraph(investigationId: string): Promise<GraphResponse> {
  return request<GraphResponse>(`/graph/${investigationId}`)
}

export function getReport(investigationId: string): Promise<ReportResponse> {
  return request<ReportResponse>(`/report/${investigationId}`)
}

export async function checkHealth(): Promise<boolean> {
  try {
    const result = await request<{ status: string }>('/health')
    return result.status === 'ok'
  } catch {
    return false
  }
}
