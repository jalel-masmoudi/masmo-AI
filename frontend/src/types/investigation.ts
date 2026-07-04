export interface InvestigationStep {
  step?: number
  action?: string
  tool?: string
  args?: Record<string, unknown>
  reasoning?: string
  decision?: string
  result_count?: number
  findings_added?: number
  evidence_added?: number
  confidence?: string
  error?: string
}

export interface InvestigationEvent {
  type: string
  timestamp?: string
  tool?: string
  args?: Record<string, unknown>
  reasoning?: string
  result_count?: number
  findings_added?: number
  evidence_added?: number
  node_count?: number
  edge_count?: number
  confidence?: string
}

export interface InvestigationProgress {
  investigation_id: string
  status: string
  question: string
  complete: boolean
  steps: InvestigationStep[]
  evidence: string[]
  findings: string[]
  events: InvestigationEvent[]
  confidence?: string | null
  error?: string | null
}

export interface InvestigateResponse {
  investigation_id: string
  status: string
  question: string
}
