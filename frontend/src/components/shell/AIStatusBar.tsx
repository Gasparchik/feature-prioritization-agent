import { useEffect, useState } from 'react'
import { useAppStore } from '../../store'
import { useT } from '../../i18n'
import { Sparkle } from '../ui/Icons'

const BUSY_STEPS = new Set(['analyzing', 'reclustering', 'generating_prd', 'generating_summary'])

export default function AIStatusBar() {
  const { step, language, totalIn, totalOut, setChatOpen } = useAppStore()
  const t = useT(language)
  const agentBusy = BUSY_STEPS.has(step)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    if (!agentBusy) return
    const id = setInterval(() => setPulse(p => p + 1), 600)
    return () => clearInterval(id)
  }, [agentBusy])

  const dots = '.'.repeat((pulse % 3) + 1)

  const message =
    step === 'analyzing'           ? t('analyzing_title') :
    step === 'reclustering'        ? t('recluster')       :
    step === 'generating_prd'      ? t('generating_prd_title') :
    step === 'generating_summary'  ? t('generating_summary_title') :
    ''

  return (
    <footer className="flex items-center gap-3.5 px-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[12.5px] min-h-[40px]">
      {/* Status dot + label */}
      <div className={`inline-flex items-center gap-2 ${agentBusy ? 'text-brand-700 dark:text-brand-300' : 'text-neutral-400'}`}>
        <span
          className={`w-2 h-2 rounded-full transition-shadow duration-300 ${agentBusy ? 'bg-brand-500 shadow-[0_0_0_4px_rgba(92,107,192,0.2)]' : 'bg-neutral-300 dark:bg-neutral-700'}`}
        />
        <span className="font-mono text-[10.5px] tracking-[0.06em] uppercase">
          {agentBusy ? t('agent') : t('idle')}
        </span>
      </div>

      {/* Message */}
      <div className="flex-1 flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 min-w-0 overflow-hidden">
        {agentBusy && <Sparkle size={12} />}
        <span className="truncate">
          {message}{agentBusy ? dots : ''}
        </span>
      </div>

      {/* Token counter */}
      {(totalIn > 0 || totalOut > 0) && (
        <div className="flex items-center gap-2.5 font-mono text-[11px] text-neutral-400">
          <span title="Input tokens">↑ {totalIn.toLocaleString()}</span>
          <span title="Output tokens">↓ {totalOut.toLocaleString()}</span>
        </div>
      )}

      {/* Ask agent button — hidden, logic preserved */}
      <button className="btn btn-sm gap-1 hidden" onClick={() => setChatOpen(true)}>
        <Sparkle size={12} /> {t('ask_agent')} <kbd className="kbd">⌘K</kbd>
      </button>
    </footer>
  )
}
