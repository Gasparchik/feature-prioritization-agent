import { useState, useRef } from 'react'
import { useAppStore, riceScore } from '../../store'
import { useT } from '../../i18n'
import * as api from '../../api'
import { sortByRice } from '../../lib/rice'
import SectionHeader from '../ui/SectionHeader'
import ScorePill from '../ui/ScorePill'
import { Refresh, ChevronRight, Plus, Merge, Trash, Undo } from '../ui/Icons'
import type { Cluster } from '../../types'

export default function ClustersScreen() {
  const {
    language, clusters, feedbackList, clustersBackup,
    appendClusters, setClusters, updateCluster, removeCluster,
    saveUndo, undo, setStep, setSessionId, sessionId,
  } = useAppStore()
  const t = useT(language)

  const [mergeSource,  setMergeSource ] = useState<number | null>(null)
  const [reclustering, setReclustering] = useState(false)

  if (!clusters) return null

  const sorted     = sortByRice(clusters)
  const totalItems = clusters.reduce((s, c) => s + c.item_count, 0)

  const handleAddCluster = () => {
    saveUndo()
    const newId = Math.max(...clusters.map(c => c.id), 0) + 1
    const nc: Cluster = {
      id: newId, name: language === 'ru' ? 'Новый кластер' : 'New cluster',
      description: language === 'ru' ? 'Опишите, что просят пользователи.' : 'Describe what users are asking for.',
      items: [], item_count: 0,
      rice: { reach: 500, reach_reasoning: '—', impact: 1, impact_reasoning: '—',
              confidence: 50, confidence_reasoning: '—', effort: 2, effort_reasoning: '—' },
      rice_score: riceScore(500, 1, 50, 2),
    }
    appendClusters([nc])
  }

  const handleMerge = (targetId: number) => {
    if (mergeSource === null || mergeSource === targetId) {
      setMergeSource(prev => prev === targetId ? null : targetId)
      return
    }
    const src = clusters.find(c => c.id === mergeSource)
    const tgt = clusters.find(c => c.id === targetId)
    if (!src || !tgt) return
    saveUndo()
    const mergedItems = [...tgt.items, ...src.items]
    const newReach    = Math.max(tgt.rice.reach, src.rice.reach)
    const newEffort   = tgt.rice.effort + src.rice.effort
    updateCluster(targetId, {
      items: mergedItems, item_count: mergedItems.length,
      rice: { ...tgt.rice, reach: newReach, effort: newEffort },
      rice_score: riceScore(newReach, tgt.rice.impact, tgt.rice.confidence, newEffort),
    })
    removeCluster(mergeSource)
    setMergeSource(null)
  }

  const handleRecluster = async () => {
    setReclustering(true)
    saveUndo()
    try {
      const result = await api.clusterFeedback(feedbackList, language)
      setClusters(result.clusters)
    } catch { /* ignore */ }
    finally { setReclustering(false) }
  }

  const autoSave = async () => {
    try {
      const id = await api.saveSession({
        language, step: 'clusters', feedback_list: feedbackList,
        clusters, session_id: sessionId,
      })
      setSessionId(id)
    } catch { /* ignore */ }
  }

  const eyebrow = `step 02 · ${clusters.length} ${language === 'ru' ? 'кластеров' : 'clusters'} · ${totalItems} ${t('feedbacks')}`
  const subtitle = t('clusters_sub_n').replace('{n}', String(totalItems))

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        eyebrow={eyebrow}
        title={t('clusters_title')}
        subtitle={subtitle}
        actions={
          <>
            <button className="btn btn-sm gap-1" disabled={reclustering}
              onClick={handleRecluster}>
              <Refresh size={13} />
              {reclustering
                ? (language === 'ru' ? 'Кластеризация…' : 'Clustering…')
                : t('recluster')}
            </button>
            {clustersBackup && (
              <button className="btn btn-sm gap-1" onClick={undo}>
                <Undo size={13} /> {t('undo')}
              </button>
            )}
            <button
              className="btn-primary btn-sm gap-1"
              onClick={() => { autoSave(); setStep('rice') }}
            >
              {t('to_rice')} <ChevronRight size={13} />
            </button>
          </>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {mergeSource !== null && (
          <div className="mb-4 px-3 py-2 bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 rounded-lg text-[12.5px] text-brand-700 dark:text-brand-300 flex items-center gap-2">
            <span>
              {language === 'ru'
                ? 'Выберите кластер, в который объединить…'
                : 'Click another cluster to merge into it…'}
            </span>
            <button
              className="underline opacity-70 hover:opacity-100"
              onClick={() => setMergeSource(null)}
            >
              {t('cancel')}
            </button>
          </div>
        )}

        <div
          className="grid gap-3 items-start"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
        >
          {sorted.map(c => (
            <ClusterCard
              key={c.id}
              cluster={c}
              isMergeSource={mergeSource === c.id}
              isMergeTarget={mergeSource !== null && mergeSource !== c.id}
              onMerge={() => handleMerge(c.id)}
              onDelete={() => { saveUndo(); removeCluster(c.id) }}
              language={language}
            />
          ))}

          <button
            onClick={handleAddCluster}
            className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl flex items-center justify-center gap-2 text-[13px] text-neutral-400 hover:border-brand-400 hover:text-brand-500 dark:hover:border-brand-600 dark:hover:text-brand-400 transition-colors min-h-[140px]"
          >
            <Plus size={16} /> {t('add_cluster')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface CardProps {
  cluster: Cluster
  isMergeSource: boolean
  isMergeTarget: boolean
  onMerge: () => void
  onDelete: () => void
  language: string
}

function ClusterCard({ cluster: c, isMergeSource, isMergeTarget, onMerge, onDelete, language }: CardProps) {
  const firstItem = c.items[0]
  const [showItems, setShowItems] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className={[
        'card flex flex-col gap-2.5 transition-all !p-[14px] !rounded-[10px] min-h-[200px]',
        isMergeSource ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/60 ring-1 ring-brand-300' : '',
        isMergeTarget ? 'cursor-pointer hover:border-brand-500 hover:shadow-lifted' : '',
      ].join(' ')}
      onClick={isMergeTarget ? onMerge : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-[13.5px] text-ink dark:text-neutral-100 leading-[1.3]">
          {c.name}
        </span>
        <ScorePill score={c.rice_score} size="sm" />
      </div>

      {/* Description */}
      {c.description && (
        <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 leading-[1.45] line-clamp-2">
          {c.description}
        </p>
      )}

      {/* First quote — hidden when list is open */}
      {firstItem && !showItems && (
        <div className="border-l-2 border-brand-100 dark:border-brand-900 pl-2.5">
          <p className="text-[12px] italic text-neutral-600 dark:text-neutral-400 leading-[1.45] line-clamp-2">
            "{firstItem}"
          </p>
        </div>
      )}

      {/* Expanded items list */}
      {showItems && c.items.length > 0 && (
        <div
          ref={listRef}
          className="flex flex-col gap-1 max-h-[220px] overflow-y-auto rounded-md border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-2.5 py-2"
        >
          {c.items.map((item, idx) => (
            <p
              key={idx}
              className="text-[12px] text-neutral-700 dark:text-neutral-300 leading-[1.5] py-1 border-b border-neutral-100 dark:border-neutral-700/50 last:border-b-0"
            >
              {item}
            </p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-dashed border-neutral-200 dark:border-neutral-800">
        <button
          className={[
            'pill cursor-pointer select-none transition-colors',
            showItems
              ? 'bg-brand-50 dark:bg-brand-950 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300'
              : 'hover:border-neutral-400 dark:hover:border-neutral-500',
          ].join(' ')}
          onClick={e => { e.stopPropagation(); setShowItems(s => !s) }}
          title={showItems
            ? (language === 'ru' ? 'Скрыть отзывы' : 'Hide items')
            : (language === 'ru' ? 'Показать отзывы' : 'Show items')}
        >
          <span className="font-mono">{c.item_count}</span>
          {' '}{language === 'ru' ? 'отзывов' : 'items'}
          <span className="ml-1 text-[10px] opacity-50">{showItems ? '▲' : '▼'}</span>
        </button>
        <div className="flex gap-0.5">
          <button
            className="btn-ghost btn-sm text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400"
            onClick={e => { e.stopPropagation(); onMerge() }}
            title={language === 'ru' ? 'Объединить' : 'Merge'}
          >
            <Merge size={13} />
          </button>
          <button
            className="btn-ghost btn-sm text-neutral-400 hover:text-red-500"
            onClick={e => { e.stopPropagation(); onDelete() }}
            title={language === 'ru' ? 'Удалить' : 'Delete'}
          >
            <Trash size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
