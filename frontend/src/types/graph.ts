export interface GraphNodeData {
  id: string
  node_type?: string
  name?: string
  title?: string
  status?: string
}

export interface GraphEdgeData {
  source: string
  target: string
  relation?: string
}

export interface GraphState {
  nodes: GraphNodeData[]
  edges: GraphEdgeData[]
}

export interface GraphResponse {
  investigation_id: string
  status: string
  graph_state: GraphState
}
