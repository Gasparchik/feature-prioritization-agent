import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import { useT } from '../../i18n'
import * as api from '../../api'
import type { SessionMeta } from '../../types'
import Drawer from '../ui/Drawer'
import * as Icons from '../ui/Icons'

export default function SessionsDrawer() {
  const {
    language, sessionId, setSessionId, clearAll, setSessionsDrawerOpen,
    sessionsDrawerOpen, setClusters, setFeedbackList, setPrdContent,
    setSummaryContent, setStep,
  } = useAppStore()
  const t = useT(language)
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [query, setQuery] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (sessionsDrawerOpen) api.getSessions().then(setSessions).catch(() => {})
  }, [sessionsDrawerOpen, sessionId])

  const filtered = sessions.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleLoad = async (id: string) => {
    const data = await api.loadSessionData(id)
    if (!data) return
    if (data.clusters)        setClusters(data.clusters)
    if (data.feedback_list)   setFeedbackList(data.feedback_list)
    if (data.prd_content)     setPrdContent(data.prd_content)
    if (data.summary_content) setSummaryContent(data.summary_content)
    if (data.step)            setStep(data.step)
    setSessionId(id)
    setSessionsDrawerOpen(false)
  }

  const handleDelete = async (id: string) => {
    await api.deleteSession(id)
    setSessions(s => s.filter(x => x.id !== id))
    if (id === sessionId) clearAll()
  }

  const startRename = (s: SessionMeta) => {
    setRenaming(s.id)
    setRenameValue(s.name)
    setTimeout(() => renameRef.current?.focus(), 50)
  }

  const commitRename = async () => {
    if (renaming && renameValue.trim()) {
      await api.renameSession(renaming, renameValue.trim())
      setSessions(s => s.map(x => x.id === renaming ? { ...x, name: renameValue.trim() } : x))
    }
    setRenaming(null)
  }

  const handleNew = () => {
    clearAll()
    setSessionsDrawerOpen(false)
  }

  return (
    <Drawer
      open={sessionsDrawerOpen}
      onClose={() => setSessionsDrawerOpen(false)}
      width={520}
      title={
        <div className="flex items-center gap-2">
          <Icons.Folder size={14} />
          <span>{t('sessions_all')}</span>
          <span className="pill font-mono text-[10px]">{sessions.length}</span>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">{t('sessions_sub')}</p>

        {/* Search + new */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md">
            <Icons.Search size={13} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('search_sessions')}
              className="flex-1 border-none outline-none bg-transparent text-[13px]"
            />
          </div>
          <button className="btn-primary btn-sm gap-1" onClick={handleNew}>
            <Icons.Plus size={13} /> {t('new_session')}
          </button>
        </div>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-[13px] text-neutral-400">{t('no_sessions')}</div>
        )}

        {/* Sessions list */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          {filtered.map((s, i) => {
            const dt = new Date(s.ts * 1000).toLocaleString(
              language === 'ru' ? 'ru-RU' : 'en-US',
              { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
            )
            const isActive = s.id === sessionId
            return (
              <div
                key={s.id}
                className={[
                  'flex items-center gap-2.5 px-3 py-2.5',
                  i < filtered.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-800' : '',
                  isActive ? 'bg-brand-50 dark:bg-brand-950' : 'bg-white dark:bg-neutral-900',
                ].join(' ')}
              >
                <Icons.Folder size={13} />
                <div className="flex-1 min-w-0">
                  {renaming === s.id ? (
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename()
                        if (e.key === 'Escape') setRenaming(null)
                      }}
                      className="input py-0.5 text-[13px]"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleLoad(s.id)}
                        className="font-semibold text-[13.5px] text-left truncate max-w-[240px] bg-transparent border-none cursor-pointer hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                      >
                        {s.name}
                      </button>
                      {isActive && (
                        <span className="pill-accent text-[9px]">{t('current_session')}</span>
                      )}
                    </div>
                  )}
                  <div className="text-[11px] text-neutral-400 mt-0.5 font-mono">{dt}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button className="btn-ghost btn-sm" onClick={() => startRename(s)} title={t('rename')}>
                    <Icons.Pencil size={12} />
                  </button>
                  <button
                    className="btn-ghost btn-sm text-red-500 dark:text-red-400"
                    onClick={() => handleDelete(s.id)}
                    title={t('delete')}
                  >
                    <Icons.Trash size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Drawer>
  )
}
