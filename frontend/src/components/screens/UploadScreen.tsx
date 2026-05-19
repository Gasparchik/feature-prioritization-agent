import { useRef, useState } from 'react'
import { useAppStore } from '../../store'
import { useT, SAMPLE_FEEDBACK } from '../../i18n'
import * as api from '../../api'
import SectionHeader from '../ui/SectionHeader'
import { Upload, Sparkle, ChevronRight } from '../ui/Icons'

type Tab = 'file' | 'text' | 'integrations'

const INTEGRATIONS = [
  { name: 'Intercom',     connected: true  },
  { name: 'App Store',    connected: true  },
  { name: 'Zendesk',      connected: false },
  { name: 'Slack',        connected: false },
  { name: 'Productboard', connected: false },
  { name: 'Typeform',     connected: false },
]

export default function UploadScreen() {
  const { language, setFeedbackList, setStep, analysisError, setAnalysisError } = useAppStore()
  const t = useT(language)

  const [tab,         setTab        ] = useState<Tab>('file')
  const [dragOver,    setDragOver   ] = useState(false)
  const [filename,    setFilename   ] = useState('')
  const [columns,     setColumns    ] = useState<string[]>([])
  const [tableData,   setTableData  ] = useState<Record<string, string[]>>({})
  const [selectedCol, setSelectedCol] = useState('')
  const [pasteText,   setPasteText  ] = useState('')
  const [error,       setError      ] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const pasteItems = pasteText.split('\n').map(l => l.trim()).filter(Boolean)
  const colItems   = selectedCol ? (tableData[selectedCol] ?? []).filter(Boolean) : []

  const handleFile = async (file: File) => {
    setError(''); setColumns([]); setTableData({}); setFilename(file.name)
    try {
      const result = await api.uploadFile(file)
      if (result.type === 'items') {
        setFeedbackList(result.items); setStep('analyzing')
      } else {
        setColumns(result.columns); setTableData(result.data)
        setSelectedCol(result.columns[0] ?? '')
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }

  const analyze = (items: string[]) => {
    if (items.length < 3) { setError(t('no_feedback')); return }
    setError(''); setAnalysisError(null); setFeedbackList(items); setStep('analyzing')
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'file',         label: t('tab_file')         },
    { key: 'text',         label: t('tab_text')         },
    { key: 'integrations', label: t('tab_integrations') },
  ]

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        eyebrow="step 01"
        title={t('upload_title')}
        subtitle={t('upload_sub')}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div
          className="max-w-[1060px] mx-auto grid gap-8"
          style={{ gridTemplateColumns: '1fr 280px' }}
        >
          {/* ── Main panel ─────────────────────────────────────────── */}
          <div>
            {/* Tabs — segmented control */}
            <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-0.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-[3px]">
              {TABS.map(tb => (
                <button
                  key={tb.key}
                  onClick={() => { setTab(tb.key); setError('') }}
                  className={[
                    'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-colors',
                    tab === tb.key
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-ink dark:text-neutral-100 shadow-soft'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300',
                  ].join(' ')}
                >
                  {tb.label}
                </button>
              ))}
            </div>
            </div>

            {/* ── File tab ───────────────────────────────────────── */}
            {tab === 'file' && (
              <div className="flex flex-col gap-4">
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragOver(false)
                    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
                  }}
                  className={[
                    'rounded-xl border border-dashed transition-colors text-center cursor-pointer',
                    'px-8 py-14',
                    dragOver
                      ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-950/30'
                      : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400',
                  ].join(' ')}
                >
                  <div className="flex justify-center mb-5 text-neutral-300 dark:text-neutral-600">
                    <Upload size={28} />
                  </div>
                  <p className="text-[15px] font-semibold text-ink dark:text-neutral-100">
                    {filename || t('drop_hint')}
                  </p>
                  <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-1.5">{t('drop_sub')}</p>
                  <p className="font-mono text-[11px] tracking-[0.06em] text-neutral-300 dark:text-neutral-600 mt-6">
                    RU · EN
                  </p>
                </div>
                <input
                  ref={fileRef} type="file" accept=".csv,.xlsx,.txt" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />

                {columns.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="eyebrow mb-1.5 block">{t('col_select')}</label>
                      <select className="select" value={selectedCol}
                        onChange={e => setSelectedCol(e.target.value)}>
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {colItems.length > 0 && (
                      <p className="text-[12px] text-neutral-500 font-mono">
                        {colItems.length} {t('feedbacks')}
                      </p>
                    )}
                    <button className="btn-primary gap-1.5"
                      onClick={() => analyze(colItems.map(String))}>
                      {t('analyze')} <ChevronRight size={13} />
                    </button>
                  </div>
                )}

                {columns.length === 0 && (
                  <button
                    onClick={() => analyze(SAMPLE_FEEDBACK[language])}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-3
                               rounded-lg border border-neutral-200 dark:border-neutral-700
                               bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/60
                               text-[13.5px] font-medium text-ink dark:text-neutral-100 transition-colors"
                  >
                    <Sparkle size={14} />
                    {t('load_demo')}
                  </button>
                )}
              </div>
            )}

            {/* ── Text tab ───────────────────────────────────────── */}
            {tab === 'text' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <button className="btn btn-sm"
                    onClick={() => setPasteText(SAMPLE_FEEDBACK[language].join('\n'))}>
                    {t('load_demo')}
                  </button>
                  {pasteItems.length > 0 && (
                    <span className="text-[12px] text-neutral-500 font-mono">
                      {pasteItems.length} {t('feedbacks')}
                    </span>
                  )}
                </div>
                <textarea
                  className="input min-h-[260px] resize-y font-mono text-[12.5px]"
                  placeholder={t('paste_placeholder')}
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                />
                <button
                  className="btn-primary gap-1.5"
                  disabled={pasteItems.length < 3}
                  onClick={() => analyze(pasteItems)}
                >
                  {t('analyze')} <ChevronRight size={13} />
                </button>
              </div>
            )}

            {/* ── Integrations tab ───────────────────────────────── */}
            {tab === 'integrations' && (
              <div className="grid grid-cols-2 gap-3">
                {INTEGRATIONS.map(int => (
                  <div
                    key={int.name}
                    className={[
                      'card flex items-center justify-between gap-3',
                      !int.connected ? 'opacity-50' : '',
                    ].join(' ')}
                  >
                    <span className="text-[13.5px] font-medium">{int.name}</span>
                    {int.connected
                      ? <span className="pill-accent">✓ connected</span>
                      : <span className="pill text-[11px] text-neutral-400">{t('coming_soon')}</span>
                    }
                  </div>
                ))}
              </div>
            )}

            {(error || analysisError) && (
              <p className="mt-3 text-[12.5px] text-red-600 dark:text-red-400">{error || analysisError}</p>
            )}
          </div>

          {/* ── Helper sidebar ─────────────────────────────────────── */}
          <aside className="self-start sticky top-0">
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkle size={14} />
                <span className="font-semibold text-[13px]">{t('helper_title')}</span>
              </div>
              <ol className="flex flex-col gap-2.5 m-0 p-0 list-none">
                {([1, 2, 3, 4] as const).map(n => (
                  <li key={n} className="flex items-start gap-2.5">
                    <span className="font-mono text-[10.5px] tracking-[0.08em] text-neutral-400 mt-[3px] w-5 shrink-0">
                      {String(n).padStart(2, '0')}
                    </span>
                    <span className="text-[12.5px] leading-[1.45] text-neutral-700 dark:text-neutral-300">
                      {t(`helper_${n}` as Parameters<typeof t>[0])}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3.5 pt-3.5 border-t border-neutral-200 dark:border-neutral-800
                            text-[11.5px] text-neutral-400 dark:text-neutral-500">
                {t('helper_time')}
              </p>
              <p className="mt-2.5 pt-2.5 border-t border-neutral-200 dark:border-neutral-800
                            text-[11.5px] text-neutral-400 dark:text-neutral-500">
                {language === 'ru'
                  ? 'Лимиты: до 20 отзывов · до 200 символов в каждом · 1 анализ в сутки'
                  : 'Limits: up to 20 items · 200 chars each · 1 analysis per day'}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
