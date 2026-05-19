import type { Cluster } from '../types'

export type RiceTier = 'high' | 'med' | 'low'

export const riceScore = (r: number, i: number, c: number, e: number) =>
  e > 0 ? Math.round((r * i * (c / 100)) / e) : 0

export const riceTier = (score: number): RiceTier =>
  score >= 200 ? 'high' : score >= 80 ? 'med' : 'low'

export const sortByRice = (clusters: Cluster[]): Cluster[] =>
  [...clusters].sort((a, b) => b.rice_score - a.rice_score)

export const tierPillClass: Record<RiceTier, string> = {
  high: 'pill-high',
  med:  'pill-med',
  low:  'pill-low',
}
