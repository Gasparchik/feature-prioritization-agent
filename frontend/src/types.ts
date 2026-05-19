export type Language = 'en' | 'ru'

export type Step =
  | 'input'
  | 'analyzing'
  | 'clusters'
  | 'reclustering'
  | 'rice'
  | 'generating_prd'
  | 'generating_summary'
  | 'prd'
  | 'summary'
  | 'export'

export interface Rice {
  reach: number
  reach_reasoning: string
  impact: number
  impact_reasoning: string
  confidence: number
  confidence_reasoning: string
  effort: number
  effort_reasoning: string
}

export interface Cluster {
  id: number
  name: string
  description: string
  summary?: string
  items: string[]
  item_count: number
  rice: Rice
  rice_score: number
}

export interface Usage {
  input: number
  output: number
}

export interface SessionMeta {
  id: string
  name: string
  ts: number
}

export interface LogLine {
  t: string
  tag: string
  msg: string
}
