import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../../store'
import { sortByRice } from '../../lib/rice'
import ScorePill from '../ui/ScorePill'

export default function ShareView() {
  const { language, clusters, prdContent, summaryContent, feedbackList, shareContentType } = useAppStore()
  const sorted = useMemo(() => sortByRice(clusters ?? []), [clusters])
  const isRu = language === 'ru'

  const isSummary = shareContentType === 'summary'
  const displayContent = isSummary ? (summaryContent ?? prdContent) : prdContent

  const wordCount = useMemo(
    () => (displayContent ?? '').split(/\s+/).filter(Boolean).length,
    [displayContent]
  )

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 flex items-center gap-3">
        <span className="font-semibold text-[14px] text-ink dark:text-neutral-100">
          Feature Analyzer
        </span>
        <span className="pill text-[11px]">
          {isRu ? 'Только просмотр' : 'Read only'}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12px] text-neutral-400 font-mono hidden sm:block">
            {feedbackList.length} {isRu ? 'отзывов' : 'feedback items'}
            {' · '}
            {sorted.length} {isRu ? 'кластеров' : 'clusters'}
            {' · '}
            {wordCount} {isRu ? 'слов' : 'words'}
          </span>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium transition-colors"
          >
            {isRu ? 'Попробовать самому →' : 'Try it yourself →'}
          </a>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div
        className="flex-1 max-w-[1100px] mx-auto w-full px-6 py-8 grid gap-8"
        style={{ gridTemplateColumns: '1fr 280px' }}
      >

        {/* PRD column */}
        <main>
          {displayContent ? (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 px-10 py-8 prose-prd">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayContent}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-neutral-400 text-[14px]">
              {isRu ? 'Документ не найден' : 'No document available'}
            </div>
          )}
        </main>

        {/* Clusters sidebar */}
        <aside className="self-start sticky top-[57px] flex flex-col gap-2.5">
          <div className="eyebrow mb-1">
            {isRu ? 'Приоритеты фич' : 'Feature priorities'}
          </div>
          {sorted.length === 0 && (
            <p className="text-[12.5px] text-neutral-400">{isRu ? 'Нет данных' : 'No data'}</p>
          )}
          {sorted.map((c, i) => (
            <div
              key={c.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="font-mono text-[10.5px] text-neutral-400 mt-0.5 shrink-0 w-5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[13px] font-semibold leading-[1.35] text-ink dark:text-neutral-100">
                  {c.name}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-7">
                <ScorePill score={c.rice_score} size="sm" />
                <span className="text-[11px] text-neutral-400 font-mono">
                  {c.item_count} {isRu ? 'отзывов' : 'items'}
                </span>
              </div>
              {c.description && (
                <p className="mt-2 pl-7 text-[11.5px] text-neutral-500 dark:text-neutral-400 leading-[1.45] line-clamp-2">
                  {c.description}
                </p>
              )}
            </div>
          ))}

          <div className="mt-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-400 leading-[1.5]">
              {isRu
                ? 'Этот документ сгенерирован автоматически на основе пользовательских отзывов с помощью Claude AI.'
                : 'This document was generated automatically from user feedback using Claude AI.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
