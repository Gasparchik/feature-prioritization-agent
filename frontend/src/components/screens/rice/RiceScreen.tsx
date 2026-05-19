import { useState } from 'react'
import { useAppStore } from '../../../store'
import { useT } from '../../../i18n'
import * as api from '../../../api'
import { sortByRice, riceTier } from '../../../lib/rice'
import SectionHeader from '../../ui/SectionHeader'
import ScorePill from '../../ui/ScorePill'
import Drawer from '../../ui/Drawer'
import Slider from '../../ui/Slider'
import { Sparkle, Doc, Undo, Split, Merge, Trash, ChevronRight } from '../../ui/Icons'
import type { Cluster } from '../../../types'

// ── View toggle ────────────────────────────────────────────────────────────────
type View = 'table' | 'matrix'

function ViewToggle({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { language } = useAppStore()
  const t = useT(language)
  return (
    <div className="flex rounded-md border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      {(['table', 'matrix'] as const).map(v => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={[
            'px-3 py-1.5 text-[12.5px] font-medium transition-colors',
            view === v
              ? 'bg-ink dark:bg-neutral-50 text-white dark:text-ink'
              : 'bg-white dark:bg-neutral-900 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
          ].join(' ')}
        >
          {v === 'table' ? t('table') : t('matrix')}
        </button>
      ))}
    </div>
  )
}

// ── RICE Table ─────────────────────────────────────────────────────────────────
function RiceTable({
  clusters, selectedId, onSelect,
}: { clusters: Cluster[]; selectedId: number | null; onSelect: (id: number) => void }) {
  const { language } = useAppStore()
  const t = useT(language)
  const maxScore = Math.max(...clusters.map(c => c.rice_score), 1)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px] border-collapse">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
            <th className="eyebrow px-3 py-2 text-left w-10">#</th>
            <th className="eyebrow px-3 py-2 text-left">{t('func_label')}</th>
            <th className="eyebrow px-3 py-2 text-right w-24">{t('reach')}</th>
            <th className="eyebrow px-3 py-2 text-right w-24">{t('impact')}</th>
            <th className="eyebrow px-3 py-2 text-right w-24">{t('conf')}</th>
            <th className="eyebrow px-3 py-2 text-right w-24">{t('effort')}</th>
            <th className="eyebrow px-3 py-2 text-right w-36">{t('rice')}</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((c, i) => {
            const tier    = riceTier(c.rice_score)
            const barPct  = (c.rice_score / maxScore) * 100
            const isSelected = c.id === selectedId
            const rankClass = i < 3
              ? 'bg-ink dark:bg-neutral-50 text-white dark:text-ink'
              : 'bg-transparent border border-neutral-300 dark:border-neutral-700 text-neutral-400'
            const barColor = tier === 'high' ? 'bg-emerald-600' :
                             tier === 'med'  ? 'bg-amber-500'   : 'bg-red-500'
            const numColor = tier === 'high' ? 'text-emerald-700 dark:text-emerald-300' :
                             tier === 'med'  ? 'text-amber-700 dark:text-amber-300'     :
                                               'text-red-700 dark:text-red-300'
            return (
              <tr
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={[
                  'border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-950/40'
                    : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-700/50',
                ].join(' ')}
              >
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold font-mono ${rankClass}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-3 py-2.5 min-w-0">
                  <div className="font-medium text-[13.5px] text-ink dark:text-neutral-100 truncate">{c.name}</div>
                  <div className="flex items-center gap-1.5 text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 min-w-0 overflow-hidden">
                    <span className="font-mono shrink-0">{c.item_count}</span>
                    <span className="shrink-0">{t('feedbacks')}</span>
                    {(c.description || c.summary) && (
                      <>
                        <span className="w-[2px] h-[2px] rounded-full bg-neutral-300 dark:bg-neutral-600 inline-block shrink-0" />
                        <span className="truncate">{c.description || c.summary}</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-neutral-600 dark:text-neutral-400">
                  {c.rice.reach.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-neutral-600 dark:text-neutral-400">
                  {c.rice.impact}×
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-neutral-600 dark:text-neutral-400">
                  {c.rice.confidence}%
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[13px] text-neutral-700 dark:text-neutral-300">
                  {c.rice.effort}
                  <span className="text-neutral-400 ml-0.5">{language === 'ru' ? ' чел.-мес' : ' mo'}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="flex-1 max-w-[120px] h-[3px] bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(4, barPct)}%` }} />
                    </div>
                    <span className={`font-mono text-[13px] font-bold ${numColor} min-w-[56px] text-right tabular-nums`}>
                      {c.rice_score.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── RICE Matrix (SVG bubble chart) ─────────────────────────────────────────────
function RiceMatrix({
  clusters, selectedId, onSelect,
}: { clusters: Cluster[]; selectedId: number | null; onSelect: (id: number) => void }) {
  const W = 1020; const H = 600
  const PAD = { l: 84, r: 36, t: 36, b: 66 }
  const maxReach = Math.max(...clusters.map(c => c.rice.reach), 1)
  const maxScore = Math.max(...clusters.map(c => c.rice_score), 1)

  const IMPACT_VALS = [0.25, 0.5, 1, 2, 3]

  const toX = (reach: number) =>
    PAD.l + ((reach / (maxReach * 1.1)) * (W - PAD.l - PAD.r))
  const toY = (impact: number) => {
    const minI = 0.1; const maxI = 3.2
    return PAD.t + ((1 - (impact - minI) / (maxI - minI)) * (H - PAD.t - PAD.b))
  }
  const bubbleR = (score: number) => 15 + 33 * Math.sqrt(score / maxScore)

  // ── Greedy label placement ──────────────────────────────────────────────────
  const CHAR_W  = 8   // px per char at fontSize=15 (monospace estimate)
  const LABEL_H = 20  // label line height
  const GAP     = 8   // gap between bubble edge and label

  const truncate = (s: string) => s.length > 16 ? s.slice(0, 15) + '…' : s

  type Slot = { x: number; y: number; w: number }
  const slots: Slot[] = []

  const collides = (x: number, y: number, w: number) =>
    slots.some(s =>
      Math.abs(x - s.x) < (w + s.w) / 2 + 6 &&
      Math.abs(y - s.y) < LABEL_H + 3
    )

  const bubbles = clusters.map(c => {
    const bx = toX(c.rice.reach)
    const by = toY(c.rice.impact)
    const br = bubbleR(c.rice_score)
    const text = truncate(c.name)
    const w = text.length * CHAR_W

    const ny = by - br - GAP  // natural y: just above bubble
    const candidates: [number, number][] = [
      [bx,           ny],
      [bx,           ny - LABEL_H - 4],
      [bx,           ny - (LABEL_H + 4) * 2],
      [bx - w * 0.6, ny],
      [bx + w * 0.6, ny],
      [bx - w * 0.6, ny - LABEL_H - 4],
      [bx + w * 0.6, ny - LABEL_H - 4],
      [bx,           by + br + GAP + LABEL_H],
      [bx - w * 0.6, by + br + GAP + LABEL_H],
      [bx + w * 0.6, by + br + GAP + LABEL_H],
    ]

    let [lx, ly] = candidates[0]
    for (const [cx_, cy_] of candidates) {
      if (!collides(cx_, cy_, w)) { [lx, ly] = [cx_, cy_]; break }
    }

    slots.push({ x: lx, y: ly, w })
    return { c, bx, by, br, lx, ly, ny, text }
  })

  return (
    <div className="overflow-x-auto">
      <svg
        width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="font-mono"
        style={{ display: 'block', maxWidth: '100%' }}
      >
        {/* Grid lines */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b}
          className="stroke-neutral-300 dark:stroke-neutral-600" strokeWidth="1.5" />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b}
          className="stroke-neutral-300 dark:stroke-neutral-600" strokeWidth="1.5" />

        {/* Impact axis labels */}
        {IMPACT_VALS.map(v => (
          <text key={v} x={PAD.l - 12} y={toY(v) + 5}
            textAnchor="end" fontSize="15"
            className="fill-neutral-400 dark:fill-neutral-500">
            {v}×
          </text>
        ))}

        {/* Reach axis labels */}
        {[0, 0.5, 1].map(frac => {
          const reach = Math.round(maxReach * frac)
          return (
            <text key={frac} x={toX(reach)} y={H - PAD.b + 22}
              textAnchor="middle" fontSize="15"
              className="fill-neutral-400 dark:fill-neutral-500">
              {reach >= 1000 ? `${(reach / 1000).toFixed(0)}k` : reach}
            </text>
          )
        })}

        {/* Axis titles */}
        <text x={(W - PAD.l - PAD.r) / 2 + PAD.l} y={H - 4} textAnchor="middle"
          fontSize="15" className="fill-neutral-500 dark:fill-neutral-400">
          Reach →
        </text>
        <text x={14} y={(H - PAD.t - PAD.b) / 2 + PAD.t} textAnchor="middle"
          fontSize="15" className="fill-neutral-500 dark:fill-neutral-400"
          transform={`rotate(-90 14 ${(H - PAD.t - PAD.b) / 2 + PAD.t})`}>
          Impact →
        </text>

        {/* Bubbles */}
        {bubbles.map(({ c, bx, by, br }, i) => {
          const tier = riceTier(c.rice_score)
          const fill = tier === 'high' ? '#059669' : tier === 'med' ? '#d97706' : '#dc2626'
          const sel  = c.id === selectedId
          return (
            <g key={c.id} onClick={() => onSelect(c.id)} style={{ cursor: 'pointer' }}>
              <circle
                cx={bx} cy={by} r={br}
                fill={fill} fillOpacity={0.12 + (c.rice.confidence / 100) * 0.25}
                stroke={fill} strokeWidth={sel ? 3.5 : 1.8}
              />
              <text x={bx} y={by + 6} textAnchor="middle" fontSize="16"
                fill={fill} fontWeight="600">
                {i + 1}
              </text>
            </g>
          )
        })}

        {/* Labels — rendered above bubbles; dashed leader line when displaced */}
        {bubbles.map(({ c, bx, by, br, lx, ly, ny }) => {
          const displaced = Math.abs(lx - bx) > 10 || Math.abs(ly - ny) > 10
          return (
            <g key={`lbl-${c.id}`}>
              {displaced && (
                <line
                  x1={bx} y1={by - br}
                  x2={lx} y2={ly + LABEL_H * 0.35}
                  className="stroke-neutral-400 dark:stroke-neutral-500"
                  strokeWidth="1" strokeDasharray="3 3"
                />
              )}
              <text x={lx} y={ly} textAnchor="middle" fontSize="15"
                className="fill-neutral-600 dark:fill-neutral-300"
                style={{ pointerEvents: 'none' }}>
                {truncate(c.name)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── RICE Editor (drawer content) ───────────────────────────────────────────────
function RiceEditor({ cluster, onClose }: { cluster: Cluster; onClose: () => void }) {
  const {
    language, clusters, updateCluster, removeCluster, saveUndo,
    toggleSplitItem, clearSplitSelection, commitSplit, moveItem, splitSelection,
  } = useAppStore()
  const t = useT(language)
  const ru = language === 'ru'

  const [splitMode,     setSplitMode    ] = useState(false)
  const [showItems,     setShowItems    ] = useState(false)
  const [showReasoning, setShowReasoning] = useState<Record<string, boolean>>({})

  const sel    = splitSelection[cluster.id] ?? []
  const others = (clusters ?? []).filter(c => c.id !== cluster.id)

  const update = (patch: Partial<Cluster['rice']>) => {
    const r = { ...cluster.rice, ...patch }
    updateCluster(cluster.id, {
      rice: r,
      rice_score: r.effort > 0
        ? Math.round((r.reach * r.impact * (r.confidence / 100)) / r.effort)
        : 0,
    })
  }

  const IMPACT_OPTS = [0.25, 0.5, 1, 2, 3]
  const IMPACT_LABEL: Record<number, [string, string]> = {
    0.25: ['Минимальное', 'Minimal'],
    0.5:  ['Низкое',      'Low'    ],
    1:    ['Среднее',     'Medium' ],
    2:    ['Высокое',     'High'   ],
    3:    ['Огромное',    'Massive'],
  }
  const impactText = (IMPACT_LABEL[cluster.rice.impact] ?? ['—', '—'])[ru ? 0 : 1]

  const toggleReasoning = (k: string) =>
    setShowReasoning(p => ({ ...p, [k]: !p[k] }))

  const ReasoningRow = ({ k, text }: { k: string; text?: string }) => (
    <div className="mt-2">
      <button
        className="flex items-center gap-1.5 text-[10.5px] tracking-[0.06em] uppercase text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        onClick={() => toggleReasoning(k)}
      >
        <span>{showReasoning[k] ? '▽' : '◇'}</span>
        {ru ? 'Обоснование агента' : 'Agent reasoning'}
      </button>
      {showReasoning[k] && text && (
        <div className="mt-1.5 p-2.5 bg-brand-50 dark:bg-brand-950 border border-brand-100 dark:border-brand-900 rounded-md">
          <p className="text-[11.5px] italic text-brand-700 dark:text-brand-300 leading-[1.5]">
            {text}
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Score + items pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <ScorePill score={cluster.rice_score} size="md" />
        <span className="pill font-mono uppercase text-[10.5px]">
          {cluster.item_count} {t('feedbacks')}
        </span>
      </div>

      {/* Name + description */}
      <div className="flex flex-col gap-2">
        <input
          className="input text-[16px] font-bold py-2 leading-[1.3]"
          value={cluster.name}
          onChange={e => updateCluster(cluster.id, { name: e.target.value })}
        />
        <textarea
          className="input text-[12.5px] leading-[1.5] resize-none"
          rows={3}
          value={cluster.description ?? ''}
          onChange={e => updateCluster(cluster.id, { description: e.target.value })}
          placeholder={ru ? 'Описание кластера…' : 'Cluster description…'}
        />
      </div>

      {/* Reach */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="font-semibold text-[13.5px]">Reach</span>
            <span className="block text-[11px] text-neutral-400 mt-0.5">
              {ru ? 'пользователей в квартал' : 'users / quarter'}
            </span>
          </div>
          <span className="font-mono text-[14px] font-semibold text-ink dark:text-neutral-100 tabular-nums">
            {cluster.rice.reach.toLocaleString()}
          </span>
        </div>
        <Slider
          label="" value={cluster.rice.reach} min={1} max={15000} step={50}
          showValue={false}
          onChange={v => update({ reach: v })}
        />
        <ReasoningRow k="reach" text={cluster.rice.reach_reasoning} />
      </div>

      {/* Impact */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="font-semibold text-[13.5px]">Impact</span>
            <span className="block text-[11px] text-neutral-400 mt-0.5">
              {ru ? 'влияние на ключевые метрики' : 'effect on key metrics'}
            </span>
          </div>
          <span className="font-mono text-[13px] font-semibold text-ink dark:text-neutral-100">
            {cluster.rice.impact} · {impactText}
          </span>
        </div>
        <div className="flex gap-1.5">
          {IMPACT_OPTS.map(v => (
            <button
              key={v}
              onClick={() => update({ impact: v })}
              className={[
                'flex-1 py-1.5 rounded-md text-[11.5px] font-mono font-medium transition-colors',
                cluster.rice.impact === v
                  ? 'bg-ink dark:bg-neutral-50 text-white dark:text-ink'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700',
              ].join(' ')}
            >
              {v}
            </button>
          ))}
        </div>
        <ReasoningRow k="impact" text={cluster.rice.impact_reasoning} />
      </div>

      {/* Confidence */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="font-semibold text-[13.5px]">Conf.</span>
            <span className="block text-[11px] text-neutral-400 mt-0.5">
              {ru ? 'уверенность в оценке' : 'estimate confidence'}
            </span>
          </div>
          <span className="font-mono text-[14px] font-semibold text-ink dark:text-neutral-100">
            {cluster.rice.confidence}%
          </span>
        </div>
        <Slider
          label="" value={cluster.rice.confidence} min={0} max={100} step={5}
          showValue={false}
          onChange={v => update({ confidence: v })}
        />
        <ReasoningRow k="conf" text={cluster.rice.confidence_reasoning} />
      </div>

      {/* Effort */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="font-semibold text-[13.5px]">Effort</span>
            <span className="block text-[11px] text-neutral-400 mt-0.5">
              {ru ? 'человеко-месяцев' : 'person-months'}
            </span>
          </div>
          <span className="font-mono text-[14px] font-semibold text-ink dark:text-neutral-100">
            {cluster.rice.effort} {ru ? 'чел.-мес' : 'p-mo'}
          </span>
        </div>
        <Slider
          label="" value={cluster.rice.effort} min={0.5} max={12} step={0.5}
          showValue={false}
          onChange={v => update({ effort: v })}
        />
        <ReasoningRow k="effort" text={cluster.rice.effort_reasoning} />
      </div>

      {/* Sources / items */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <button
            className="flex items-center gap-1.5 eyebrow cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            onClick={() => setShowItems(s => !s)}
          >
            <span className="text-[8px]">{showItems ? '▽' : '▷'}</span>
            {ru
              ? `ИСТОЧНИКИ — ${cluster.item_count} ОТЗЫВОВ В КЛАСТЕРЕ`
              : `SOURCES — ${cluster.item_count} ITEMS IN CLUSTER`}
          </button>
          {!splitMode ? (
            <button
              className="text-[11.5px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0"
              onClick={() => { setSplitMode(true); clearSplitSelection(cluster.id); setShowItems(true) }}
            >
              <Split size={11} /> {ru ? 'Разделить кластер' : 'Split cluster'}
            </button>
          ) : (
            <div className="flex gap-1.5 shrink-0">
              <button
                className="btn-primary btn-sm gap-1 text-[11px]"
                disabled={sel.length === 0 || sel.length === cluster.items.length}
                onClick={() => { commitSplit(cluster.id); setSplitMode(false); onClose() }}
              >
                <Split size={11} /> {t('split_btn')} ({sel.length})
              </button>
              <button
                className="btn btn-sm text-[11px]"
                onClick={() => { setSplitMode(false); clearSplitSelection(cluster.id) }}
              >
                {t('cancel_split')}
              </button>
            </div>
          )}
        </div>

        {showItems && (
          <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
            {cluster.items.map((item, idx) => (
              <div
                key={idx}
                className={[
                  'flex items-start gap-2 p-2 rounded-md text-[12px]',
                  splitMode
                    ? 'cursor-pointer ' + (sel.includes(idx)
                        ? 'bg-brand-50 dark:bg-brand-950 border border-brand-300'
                        : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-brand-50 dark:hover:bg-brand-950/50')
                    : 'bg-neutral-50 dark:bg-neutral-800',
                ].join(' ')}
                onClick={() => splitMode && toggleSplitItem(cluster.id, idx)}
              >
                {splitMode && (
                  <span className={`mt-0.5 w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center text-[9px] ${
                    sel.includes(idx) ? 'bg-brand-500 border-brand-500 text-white' : 'border-neutral-300 dark:border-neutral-600'
                  }`}>
                    {sel.includes(idx) ? '✓' : ''}
                  </span>
                )}
                <span className="flex-1 text-neutral-700 dark:text-neutral-300 leading-[1.45]">
                  {item}
                </span>
                {!splitMode && others.length > 0 && (
                  <select
                    className="text-[11px] border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 bg-white dark:bg-neutral-900 text-neutral-500 shrink-0 appearance-none cursor-pointer"
                    defaultValue=""
                    onChange={e => {
                      const toId = Number(e.target.value)
                      if (toId) { saveUndo(); moveItem(cluster.id, idx, toId) }
                      e.target.value = ''
                    }}
                  >
                    <option value="">{t('move_to')}</option>
                    {others.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ── RiceScreen (main) ──────────────────────────────────────────────────────────
export default function RiceScreen() {
  const {
    language, clusters, clustersBackup, totalIn, totalOut,
    undo, saveUndo, removeCluster, setStep, setSessionId, sessionId, feedbackList,
    selectPrdCluster,
  } = useAppStore()
  const t = useT(language)

  const [view, setView] = useState<View>(() => {
    try { return (localStorage.getItem('rice-view') as View) || 'table' } catch { return 'table' }
  })
  const handleSetView = (v: View) => {
    setView(v)
    try { localStorage.setItem('rice-view', v) } catch {}
  }
  const [selectedId, setSelectedId] = useState<number | null>(null)

  if (!clusters) return null

  const sorted     = sortByRice(clusters)
  const totalItems = clusters.reduce((s, c) => s + c.item_count, 0)
  const topCluster = sorted[0]
  const sumReach   = clusters.reduce((s, c) => s + c.rice.reach, 0)
  const sumEffort  = clusters.reduce((s, c) => s + c.rice.effort, 0)

  const selectedCluster = selectedId !== null
    ? clusters.find(c => c.id === selectedId) ?? null
    : null

  const autoSave = async () => {
    try {
      const id = await api.saveSession({
        language, step: 'rice', feedback_list: feedbackList,
        clusters, session_id: sessionId,
      })
      setSessionId(id)
    } catch { /* ignore */ }
  }

  const handleSelect = (id: number) =>
    setSelectedId(prev => prev === id ? null : id)

  const riceMetaStr = t('rice_meta_n')
    .replace('{clusters}', String(clusters.length))
    .replace('{items}', String(totalItems))

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        eyebrow={riceMetaStr}
        title={t('rice_title')}
        subtitle={t('rice_sub')}
        actions={
          <>
            <ViewToggle view={view} setView={handleSetView} />
            <button className="btn btn-sm gap-1" disabled={!clustersBackup} onClick={undo}>
              <Undo size={13} /> {t('undo')}
            </button>
            <button
              className="btn btn-sm gap-1"
              onClick={() => { autoSave(); setStep('generating_summary') }}
            >
              <Sparkle size={13} /> {t('summary_btn')}
            </button>
            <button
              className="btn-primary btn-sm gap-1"
              onClick={() => { autoSave(); selectPrdCluster(topCluster.id); setStep('prd') }}
            >
              <Doc size={13} /> {t('create_prd')} <ChevronRight size={13} />
            </button>
          </>
        }
      />

      {/* Stats strip */}
      <div
        className="grid border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
      >
        {[
          {
            label: t('top_priority'),
            value: topCluster?.name ?? '—',
            mono: false,
          },
          {
            label: t('rice_score'),
            value: topCluster ? String(Math.round(topCluster.rice_score)) : '—',
            node: topCluster ? <ScorePill score={topCluster.rice_score} size="md" /> : undefined,
          },
          {
            label: t('sum_reach'),
            value: sumReach.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US'),
            mono: true,
          },
          {
            label: t('sum_effort'),
            value: `${sumEffort} ${language === 'ru' ? 'чел.-мес' : 'person-mo'}`,
            mono: true,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className={[
              'px-4 py-3',
              i < 3 ? 'border-r border-neutral-200 dark:border-neutral-800' : '',
            ].join(' ')}
          >
            <div className="eyebrow mb-1">{stat.label}</div>
            {stat.node ?? (
              <div className={[
                'text-[15px] font-semibold text-ink dark:text-neutral-100 truncate',
                stat.mono ? 'font-mono' : '',
              ].join(' ')}>
                {stat.value}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        {view === 'table' && (
          <RiceTable clusters={sorted} selectedId={selectedId} onSelect={handleSelect} />
        )}
        {view === 'matrix' && (
          <RiceMatrix clusters={sorted} selectedId={selectedId} onSelect={handleSelect} />
        )}
      </div>

      {/* Editor drawer */}
      <Drawer
        open={selectedCluster !== null}
        onClose={() => setSelectedId(null)}
        title={t('edit_score')}
        width={480}
        footer={selectedCluster ? (
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <button className="btn gap-1.5" onClick={() => setSelectedId(null)}>
                <Merge size={14} /> {t('merge_clusters')}
              </button>
              <button
                className="btn gap-1.5 text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => { saveUndo(); removeCluster(selectedCluster.id); setSelectedId(null) }}
              >
                <Trash size={14} /> {t('delete')}
              </button>
            </div>
            <button className="btn-primary px-4" onClick={() => setSelectedId(null)}>
              {t('confirm')}
            </button>
          </div>
        ) : undefined}
      >
        {selectedCluster && (
          <RiceEditor
            cluster={selectedCluster}
            onClose={() => setSelectedId(null)}
          />
        )}
      </Drawer>
    </div>
  )
}
