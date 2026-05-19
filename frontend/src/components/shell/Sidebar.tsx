import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '../../store'
import { useT } from '../../i18n'
import type { Step } from '../../types'
import type { SessionMeta } from '../../types'
import * as api from '../../api'
import BrandMark from './BrandMark'
import * as Icons from '../ui/Icons'

interface NavItem {
  label: string
  labelEn: string
  step: Step
  navIdx: number
  Icon: React.ComponentType<{ size?: number }>
}

const NAV: NavItem[] = [
  { label: 'Загрузка',  labelEn: 'Upload',   step: 'input',   navIdx: 0, Icon: Icons.Upload  },
  { label: 'Кластеры', labelEn: 'Clusters', step: 'clusters', navIdx: 1, Icon: Icons.Cluster },
  { label: 'RICE',     labelEn: 'RICE',     step: 'rice',     navIdx: 2, Icon: Icons.Chart   },
  { label: 'PRD',      labelEn: 'PRD',      step: 'prd',      navIdx: 3, Icon: Icons.Doc     },
  { label: 'Summary',  labelEn: 'Summary',  step: 'summary',  navIdx: 4, Icon: Icons.Sparkle },
  { label: 'Экспорт',  labelEn: 'Export',   step: 'export',   navIdx: 5, Icon: Icons.Send    },
]

function currentNavIdx(step: Step): number {
  const m: Partial<Record<Step, number>> = {
    input: 0, analyzing: 0,
    clusters: 1, reclustering: 1,
    rice: 2,
    generating_prd: 3, prd: 3,
    generating_summary: 4, summary: 4,
    export: 5,
  }
  return m[step] ?? 0
}

export default function Sidebar() {
  const { step, setStep, language, setLanguage, clusters, sessionId, setChatOpen, setSessionsDrawerOpen, theme, toggleTheme } = useAppStore()
  const t = useT(language)
  const [sessions, setSessions] = useState<SessionMeta[]>([])

  useEffect(() => {
    api.getSessions().then(setSessions).catch(() => {})
  }, [sessionId])

  const navIdx = currentNavIdx(step)
  const hasData = clusters !== null && clusters.length > 0

  return (
    <aside className="flex flex-col h-full border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
        <BrandMark size={22} />
        <div className="leading-[1.15]">
          <div className="font-semibold text-[13.5px] tracking-[-0.01em]">Prioritize</div>
          <div className="text-[11px] text-neutral-400">feedback → backlog</div>
        </div>
      </div>

      {/* Session selector */}
      <div className="px-2.5 pb-3">
        <button
          onClick={() => setSessionsDrawerOpen(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-[12.5px] text-neutral-700 dark:text-neutral-300 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          <Icons.Folder size={12} />
          <span className="flex-1 text-left truncate">{t('sessions_title')}</span>
          <Icons.ChevronRight size={12} />
        </button>
      </div>

      {/* Pipeline nav */}
      <div className="px-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <div className="eyebrow px-1 py-2">{t('pipeline')}</div>
        <nav className="flex flex-col gap-px">
          {NAV.map((item) => {
            const done = item.navIdx < navIdx
            const active = item.navIdx === navIdx
            const reachable = item.navIdx === 0 || navIdx >= item.navIdx || hasData
            const label = language === 'en' ? item.labelEn : item.label

            return (
              <button
                key={item.step}
                onClick={() => reachable && setStep(item.step)}
                disabled={!reachable}
                className={[
                  'flex items-center gap-2.5 px-2 py-[7px] rounded-md border text-[13px] text-left transition-colors',
                  active
                    ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-semibold'
                    : 'border-transparent',
                  reachable
                    ? 'text-neutral-700 dark:text-neutral-300 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-[18px] h-[18px] rounded-full inline-flex items-center justify-center shrink-0',
                    'font-mono text-[10.5px] font-semibold',
                    done
                      ? 'bg-brand-500 text-white'
                      : active
                        ? 'bg-ink text-white dark:bg-neutral-50 dark:text-ink'
                        : 'border border-neutral-300 dark:border-neutral-600 text-neutral-400',
                  ].join(' ')}
                >
                  {done ? <Icons.Check size={10} /> : item.navIdx + 1}
                </span>
                <span className="flex-1">{label}</span>
                {active && <Icons.ChevronRight size={12} />}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Recent sessions */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-800 min-h-0">
        <div className="eyebrow px-1 py-2 flex justify-between items-center">
          <span>{t('recent')}</span>
          <button
            className="btn-ghost btn-sm p-px"
            onClick={() => setSessionsDrawerOpen(true)}
            title={t('new_session')}
          >
            <Icons.Plus size={12} />
          </button>
        </div>
        {sessions.slice(0, 5).map((s) => {
          const dt = new Date(s.ts * 1000).toLocaleDateString(
            language === 'ru' ? 'ru-RU' : 'en-US',
            { month: 'short', day: 'numeric' }
          )
          return (
            <div
              key={s.id}
              className={[
                'px-2 py-1.5 rounded-md cursor-pointer text-[12.5px] transition-colors',
                s.id === sessionId
                  ? 'bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-100'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800',
              ].join(' ')}
              onClick={() => setSessionsDrawerOpen(true)}
            >
              <div className="flex justify-between gap-1.5">
                <span className="truncate flex-1">{s.name}</span>
                <span className="font-mono text-[11px] text-neutral-400 shrink-0">{dt}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom bar */}
      <div className="px-3 py-2.5 border-t border-neutral-200 dark:border-neutral-800 flex gap-1.5">
        {/* Ask agent — hidden, logic preserved */}
        <button
          className="btn-ghost btn-sm flex-1 justify-center gap-1 hidden"
          onClick={() => setChatOpen(true)}
        >
          <Icons.Sparkle size={12} /> {t('ask_agent')} <kbd className="kbd">⌘K</kbd>
        </button>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="btn-ghost btn-sm gap-1"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
        <button
          className="btn-ghost btn-sm gap-1"
          onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
          title="Language"
        >
          <Icons.Globe size={12} /> {language.toUpperCase()}
        </button>
      </div>
    </aside>
  )
}
