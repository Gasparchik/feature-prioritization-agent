import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import { useT } from '../../i18n'
import SectionHeader from './SectionHeader'
import { Sparkle } from './Icons'
import type { LogLine } from '../../types'

export type { LogLine }

interface Props {
  title: string
  subtitle: string
  eyebrow?: string
  log: LogLine[]
  liveLog?: LogLine[]
  estSec?: number
  onCancel?: () => void
  cancelLabel?: string
}

export default function LoadingScreen({ title, subtitle, eyebrow, log, liveLog, estSec = 30, onCancel, cancelLabel }: Props) {
  const { language } = useAppStore()
  const t = useT(language)
  const [shown, setShown] = useState<LogLine[]>([])
  const [tick, setTick] = useState(0)
  const startRef = useRef(Date.now())

  // If liveLog is provided, show it directly; otherwise simulate timed reveal
  useEffect(() => {
    if (liveLog && liveLog.length > 0) {
      setShown(liveLog)
      return
    }
  }, [liveLog])

  useEffect(() => {
    if (liveLog) return  // don't run simulation when live data is present
    setShown([])
    if (!log.length) return
    let i = 0
    const id = setInterval(() => {
      i++
      setShown(log.slice(0, i))
      if (i >= log.length) clearInterval(id)
    }, 600)
    return () => clearInterval(id)
  }, [log, liveLog])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsed = Math.floor((Date.now() - startRef.current) / 1000) + tick * 0  // tick forces re-render
  const pct = Math.min(98, (elapsed / estSec) * 100)

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={onCancel ? (
          <button className="btn" onClick={onCancel}>{cancelLabel ?? t('cancel')}</button>
        ) : undefined}
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1100px] mx-auto grid gap-6" style={{ gridTemplateColumns: '1fr 380px' }}>
          {/* Agent panel */}
          <div className="card flex flex-col gap-5 min-h-[360px] p-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-brand-50 dark:bg-brand-950 text-brand-500 dark:text-brand-400 inline-flex items-center justify-center animate-loading-pulse">
                <Sparkle size={18} />
              </div>
              <div>
                <div className="font-semibold text-[15px]">{title}</div>
                <div className="text-[12.5px] text-neutral-500 dark:text-neutral-400">{subtitle}</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-mono text-[11px] text-neutral-500 mb-1.5 tracking-[0.04em]">
                <span>{elapsed}s elapsed</span>
                <span>~ {estSec}s {t('est')}</span>
              </div>
              <div className="h-[3px] bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-[width] duration-500 ease-out rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="flex-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3.5 py-3 font-mono text-[11.5px] leading-[1.65] overflow-auto min-h-[180px]">
              {shown.length === 0 && (
                <div className="text-neutral-400">initializing…</div>
              )}
              {shown.map((line, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${i === shown.length - 1 && shown.length < log.length ? 'text-brand-700 dark:text-brand-300' : 'text-neutral-600 dark:text-neutral-400'}`}
                >
                  <span className="text-neutral-400 shrink-0">{line.t}</span>
                  <span className="text-brand-700 dark:text-brand-300 min-w-[60px]">{line.tag}</span>
                  <span className="flex-1">{line.msg}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {i < shown.length - 1 ? '✓' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips aside */}
          <aside className="card p-4 text-[12.5px] self-start">
            <div className="eyebrow mb-3">Tips</div>
            <div className="flex flex-col gap-2.5 text-neutral-600 dark:text-neutral-400">
              <div>· Можно работать с другими сессиями, пока агент думает</div>
              <div>· История действий сохраняется автоматически</div>
              <div>· Откройте <kbd className="kbd">⌘K</kbd>, чтобы спросить агента</div>
              <div className="my-1.5 border-t border-neutral-200 dark:border-neutral-800" />
              <div className="text-[11.5px] text-neutral-400">
                Model: <span className="font-mono">claude-sonnet-4-6</span><br />
                Stream: SSE
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
