import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../../store'
import { useT } from '../../i18n'
import * as api from '../../api'
import { sortByRice } from '../../lib/rice'
import SectionHeader from '../ui/SectionHeader'
import ScorePill from '../ui/ScorePill'
import { Sparkle, ChevronRight, Pencil, Doc, Copy, Check, Link, Clock } from '../ui/Icons'

export default function PrdScreen() {
  const {
    language, clusters, prdContent, streaming, feedbackList, sessionId,
    setStep, setSessionId, setPrdContent, prdHistory, restorePrdVersion,
    stopGeneration, currentPrdClusterId, selectPrdCluster, cachePrdContent,
    prdCache,
  } = useAppStore()
  const t = useT(language)

  const [editMode, setEditMode] = useState(false)
  const [localText, setLocalText] = useState('')
  const [copyMdDone, setCopyMdDone] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  // All hooks before early return
  const sorted = useMemo(() => sortByRice(clusters ?? []), [clusters])
  // The cluster whose PRD is currently displayed. Falls back to top-RICE when
  // no explicit selection (or the stored id no longer matches any cluster —
  // e.g. user deleted that cluster between sessions).
  const current = useMemo(() => {
    if (!clusters) return null
    if (currentPrdClusterId !== null) {
      const match = clusters.find(c => c.id === currentPrdClusterId)
      if (match) return match
    }
    return sorted[0] ?? null
  }, [clusters, currentPrdClusterId, sorted])
  // All clusters in RICE order — the active one is highlighted, others are
  // clickable to switch. Including the active one keeps the list complete and
  // gives the user a visual anchor showing which cluster they are on.
  const clusterList = sorted

  const sections = useMemo(() => {
    return (prdContent ?? '').split('\n')
      .filter(l => l.startsWith('## '))
      .map((l, i) => ({
        title: l.slice(3).trim().replace(/^\d+\.\s*/, ''),
        index: i,
      }))
  }, [prdContent])

  const wordCount = useMemo(
    () => (prdContent ?? '').split(/\s+/).filter(Boolean).length,
    [prdContent]
  )

  // Ref for the scrollable content pane — used by section nav clicks
  const contentScrollRef = useRef<HTMLDivElement>(null)
  const hasRestoredScroll = useRef(false)

  const [activeSection, setActiveSection] = useState(0)

  // Restore saved scroll position after content renders (once per mount)
  useEffect(() => {
    if (hasRestoredScroll.current || streaming || !prdContent) return
    const scroller = contentScrollRef.current
    if (!scroller) return
    const saved = sessionStorage.getItem('prd-scroll')
    if (saved && Number(saved) > 0) {
      requestAnimationFrame(() => {
        scroller.scrollTop = Number(saved)
        hasRestoredScroll.current = true
      })
    } else {
      hasRestoredScroll.current = true
    }
  }, [prdContent, streaming])

  // Save scroll position + track active section on scroll
  useEffect(() => {
    const scroller = contentScrollRef.current
    if (!scroller) return
    const onScroll = () => {
      sessionStorage.setItem('prd-scroll', String(scroller.scrollTop))
      const headings = Array.from(
        scroller.querySelectorAll('[data-prd-h2]')
      ) as HTMLElement[]
      if (!headings.length) return
      const threshold = scroller.getBoundingClientRect().top + 80
      let active = 0
      for (let i = headings.length - 1; i >= 0; i--) {
        if (headings[i].getBoundingClientRect().top <= threshold) {
          active = i
          break
        }
      }
      setActiveSection(active)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [prdContent])

  // Auto-save when streaming completes
  useEffect(() => {
    if (!streaming && prdContent && clusters) {
      api.saveSession({
        language, step: 'prd', feedback_list: feedbackList,
        clusters, prd_content: prdContent, session_id: sessionId,
      }).then(setSessionId).catch(() => {})
    }
  }, [streaming])

  if (!clusters) return null

  // Empty state: no PRD generated yet for the current cluster — user must
  // explicitly click Generate. We DON'T auto-start generation on entry.
  const hasContent = !!prdContent
  const showEmptyState = !hasContent && !streaming

  // Enter edit mode: seed localText from store
  const handleEnterEdit = () => {
    setLocalText(prdContent ?? '')
    setEditMode(true)
  }
  const handleSaveEdit = () => {
    setPrdContent(localText)
    // Persist the edit into the per-cluster cache too, otherwise switching to
    // another cluster and back would reload the pre-edit version from cache.
    if (currentPrdClusterId !== null) {
      cachePrdContent(currentPrdClusterId, localText)
    }
    setEditMode(false)
  }
  const handleCancelEdit = () => {
    setEditMode(false)
  }

  const handleCopyMd = () => {
    if (!prdContent) return
    navigator.clipboard.writeText(prdContent).then(() => {
      setCopyMdDone(true)
      setTimeout(() => setCopyMdDone(false), 2000)
    })
  }

  const handleShare = () => {
    if (!sessionId) return
    const url = `${window.location.origin}/?session=${sessionId}&share=1&type=prd`
    navigator.clipboard.writeText(url).then(() => {
      setShareDone(true)
      setTimeout(() => setShareDone(false), 2000)
    })
  }

  const scrollToSection = (index: number) => {
    const scroller = contentScrollRef.current
    if (!scroller) return
    const headings = scroller.querySelectorAll('[data-prd-h2]')
    const el = headings[index] as HTMLElement | undefined
    if (!el) return
    const offset = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16
    scroller.scrollTo({ top: offset, behavior: 'smooth' })
  }


  const dateStr = new Date().toLocaleDateString(
    language === 'ru' ? 'ru-RU' : 'en-US',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  )

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        eyebrow={`step 04 · ${language === 'ru' ? 'сгенерировано агентом' : 'generated by agent'}`}
        title={current?.name ?? t('prd_preview')}
        subtitle={streaming ? t('prd_sub_streaming') : t('prd_sub_done')}
        actions={
          <>
            {streaming && (
              <button
                className="btn-primary btn-sm gap-1"
                onClick={stopGeneration}
              >
                {t('stop')}
              </button>
            )}
            <button
              className="btn btn-sm gap-1"
              disabled={streaming || !sessionId}
              onClick={handleShare}
            >
              {shareDone
                ? <><Check size={12} /> {language === 'ru' ? 'Скопировано!' : 'Copied!'}</>
                : <><Link size={12} /> {language === 'ru' ? 'Поделиться' : 'Share'}</>}
            </button>
            {/* History dropdown */}
            <div className="relative">
              <button
                className="btn btn-sm gap-1"
                disabled={streaming || prdHistory.length === 0}
                onClick={() => setHistoryOpen(o => !o)}
              >
                <Clock size={12} />
                {prdHistory.length > 0 ? `(${prdHistory.length})` : ''}
              </button>
              {historyOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setHistoryOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 overflow-hidden py-1">
                    <div className="px-3 py-1.5 text-[10.5px] font-semibold tracking-[0.08em] uppercase text-neutral-400">
                      {language === 'ru' ? 'История версий' : 'Version history'}
                    </div>
                    {prdHistory.map((v, i) => (
                      <button
                        key={v.ts}
                        className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-between gap-2 transition-colors"
                        onClick={() => { restorePrdVersion(i); setHistoryOpen(false) }}
                      >
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {language === 'ru' ? `Версия ${prdHistory.length - i}` : `Version ${prdHistory.length - i}`}
                        </span>
                        <span className="font-mono text-[10.5px] text-neutral-400 shrink-0">
                          {new Date(v.ts).toLocaleTimeString(
                            language === 'ru' ? 'ru-RU' : 'en-US',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              className="btn btn-sm gap-1"
              disabled={streaming}
              onClick={() => setStep('generating_summary')}
            >
              <Sparkle size={13} /> {t('summary_btn')}
            </button>
            <button className="btn btn-sm" onClick={() => setStep('rice')}>
              {language === 'ru' ? 'Назад' : 'Back'}
            </button>
            <button
              className="btn-primary btn-sm gap-1"
              disabled={streaming}
              onClick={() => setStep('export')}
            >
              {t('export_title')} <ChevronRight size={13} />
            </button>
          </>
        }
      />

      <div
        className="flex-1 min-h-0 overflow-hidden grid"
        style={{ gridTemplateColumns: showEmptyState ? '1fr 280px' : '220px 1fr 280px' }}
      >
        {/* Left: sections nav — hidden in empty state */}
        {!showEmptyState && (
          <nav className="border-r border-neutral-200 dark:border-neutral-800 p-3 overflow-y-auto bg-white dark:bg-neutral-900">
            <div className="eyebrow px-2 py-1.5 mb-1">{t('sections')}</div>
            {sections.length === 0 && (
              <p className="text-[12px] text-neutral-400 px-2 py-1">{streaming ? '…' : '—'}</p>
            )}
            {sections.map((s, i) => {
              const isActive = i === activeSection
              return (
                <button
                  key={s.index}
                  onClick={() => scrollToSection(s.index)}
                  className={[
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left',
                    isActive
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-ink dark:text-neutral-100'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  ].join(' ')}
                >
                  <span className={[
                    'font-mono text-[10.5px] tracking-[0.06em] w-5 shrink-0',
                    isActive ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-400',
                  ].join(' ')}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans text-[13px] font-medium truncate">{s.title}</span>
                </button>
              )
            })}
          </nav>
        )}

        {/* Center: content or empty-state CTA */}
        <div ref={contentScrollRef} className="overflow-y-auto">
          {showEmptyState ? (
            <div className="flex items-center justify-center min-h-full px-10 py-8">
              <div className="max-w-[480px] w-full text-center">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-500 dark:text-brand-400 inline-flex items-center justify-center">
                  <Doc size={24} />
                </div>
                <h2 className="text-[20px] font-semibold text-ink dark:text-neutral-100 mb-2">
                  {language === 'ru' ? 'PRD ещё не сгенерирован' : 'PRD not generated yet'}
                </h2>
                <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 leading-[1.55] mb-6">
                  {language === 'ru'
                    ? `Документ будет создан по продуктовому шаблону на основе данных кластера «${current?.name ?? '—'}» и пользовательских отзывов в нём.`
                    : `The document will be generated using the product PRD template based on the «${current?.name ?? '—'}» cluster and the user feedback it contains.`}
                </p>
                <button
                  className="btn-primary px-5 py-2.5 text-[14px] gap-2 inline-flex items-center"
                  onClick={() => setStep('generating_prd')}
                >
                  <Sparkle size={14} />
                  {language === 'ru' ? 'Сгенерировать PRD' : 'Generate PRD'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Sticky metadata bar — pinned at top of the scroll area */}
              <div className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
                <div className="max-w-[680px] mx-auto px-10 py-3 flex items-center flex-wrap gap-2">
                  {current && <ScorePill score={current.rice_score} />}
                  <span className="pill">draft v1</span>
                  <span className="pill font-mono text-[10.5px]">
                    {current?.item_count ?? 0} {t('feedbacks')}
                  </span>
                  <span className="pill font-mono text-[10.5px]">{wordCount} {language === 'ru' ? 'слов' : 'words'}</span>
                  <span className="pill font-mono text-[10.5px]">{dateStr}</span>
                  {!streaming && (
                    <div className="ml-auto flex items-center gap-1.5">
                      {!editMode && (
                        <button className="btn btn-sm gap-1" onClick={handleCopyMd}>
                          {copyMdDone
                            ? <><Check size={12} /> {language === 'ru' ? 'Скопировано!' : 'Copied!'}</>
                            : <><Copy size={12} /> {language === 'ru' ? 'Копировать MD' : 'Copy MD'}</>}
                        </button>
                      )}
                      <button
                        className="btn btn-sm gap-1"
                        onClick={editMode ? handleCancelEdit : handleEnterEdit}
                      >
                        <Pencil size={12} />
                        {editMode
                          ? (language === 'ru' ? 'Отмена' : 'Cancel')
                          : (language === 'ru' ? 'Редактировать' : 'Edit')}
                      </button>
                      {editMode && (
                        <button className="btn-primary btn-sm gap-1" onClick={handleSaveEdit}>
                          <Doc size={12} /> {language === 'ru' ? 'Сохранить' : 'Save'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <article className="max-w-[680px] mx-auto px-10 py-8">
              {editMode ? (
                <textarea
                  className="input min-h-[600px] resize-y font-mono text-[12.5px] leading-[1.6]"
                  value={localText}
                  onChange={e => setLocalText(e.target.value)}
                  spellCheck={false}
                />
              ) : (
                <div className="prose-prd">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ children, ...props }) => (
                        <h2 data-prd-h2 {...props}>{children}</h2>
                      ),
                    }}
                  >
                    {prdContent}
                  </ReactMarkdown>
                  {streaming && <span className="stream-caret" />}
                </div>
              )}
              </article>
            </>
          )}
        </div>

        {/* Right: cluster switcher */}
        <aside className="border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto p-4 bg-white dark:bg-neutral-900">
          {clusterList.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Doc size={14} />
                <span className="font-semibold text-[13px]">
                  {language === 'ru' ? 'Кластеры' : 'Clusters'}
                </span>
              </div>
              <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mb-3 leading-[1.45]">
                {language === 'ru'
                  ? 'Все кластеры в порядке RICE. Откройте любой — сгенерированный PRD закешируется.'
                  : 'All clusters in RICE order. Open any — its generated PRD is cached.'}
              </p>
              <div className="flex flex-col gap-1.5">
                {clusterList.map(c => {
                  const isActive = c.id === current?.id
                  const hasPrd = !!prdCache[c.id]
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectPrdCluster(c.id)}
                      disabled={streaming}
                      aria-current={isActive ? 'true' : undefined}
                      title={hasPrd
                        ? (language === 'ru' ? 'PRD сгенерирован' : 'PRD generated')
                        : undefined}
                      className={[
                        'text-left px-2.5 py-2 border rounded-md transition-colors flex items-center gap-2',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        isActive
                          ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-400 dark:border-brand-600 ring-1 ring-brand-300 dark:ring-brand-700'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 disabled:hover:border-neutral-200 disabled:hover:bg-neutral-50 dark:disabled:hover:bg-neutral-800',
                      ].join(' ')}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          'inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0',
                          hasPrd
                            ? 'bg-emerald-500 text-white'
                            : 'border border-dashed border-neutral-300 dark:border-neutral-600',
                        ].join(' ')}
                      >
                        {hasPrd && <Check size={10} />}
                      </span>
                      <span
                        className={[
                          'flex-1 text-[12.5px] leading-[1.35] truncate',
                          isActive
                            ? 'font-semibold text-brand-700 dark:text-brand-300'
                            : 'text-neutral-700 dark:text-neutral-300',
                        ].join(' ')}
                      >
                        {c.name}
                      </span>
                      <ScorePill score={c.rice_score} size="sm" />
                    </button>
                  )
                })}
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-800 my-4" />
            </>
          )}

          <div className="flex flex-col gap-2">
            <button
              className="btn btn-sm gap-1 w-full justify-center"
              onClick={() => prdContent && api.downloadDocx(clusters, prdContent, language)}
              disabled={streaming || !prdContent}
            >
              {t('download_docx')}
            </button>
            <button
              className="btn btn-sm gap-1 w-full justify-center"
              onClick={() => api.downloadJira(clusters, language)}
              disabled={streaming}
            >
              {t('download_jira')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
