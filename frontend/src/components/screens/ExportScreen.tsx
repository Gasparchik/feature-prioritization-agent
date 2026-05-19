import { useState } from 'react'
import { useAppStore } from '../../store'
import { useT } from '../../i18n'
import * as api from '../../api'
import { sortByRice } from '../../lib/rice'
import SectionHeader from '../ui/SectionHeader'
import { Doc, Send } from '../ui/Icons'

type FormatKey = 'docx_prd' | 'docx_summary' | 'csv' | 'xlsx' | 'jira' | 'notion' | 'linear'

interface FormatDef {
  k: FormatKey
  label: string
  ext: string
  desc: string
  on: boolean
  download?: () => void
}

export default function ExportScreen() {
  const { language, clusters, prdContent, summaryContent, setStep } = useAppStore()
  const t = useT(language)
  const ru = language === 'ru'
  const [format, setFormat] = useState<FormatKey>('docx_prd')

  const hasClusters = !!clusters?.length
  const hasPrd      = !!prdContent
  const hasSummary  = !!summaryContent

  const formats: FormatDef[] = [
    {
      k: 'docx_prd',
      label: 'PRD',
      ext: '.docx',
      desc: ru ? 'Microsoft Word — черновик документа' : 'Microsoft Word document',
      on: hasClusters && hasPrd,
      download: () => clusters && prdContent && api.downloadDocx(clusters, prdContent, language),
    },
    {
      k: 'docx_summary',
      label: 'Summary',
      ext: '.docx',
      desc: ru ? 'Резюме для стейкхолдеров' : 'Executive summary',
      on: hasClusters && hasSummary,
      download: () => clusters && summaryContent && api.downloadDocx(clusters, summaryContent, language),
    },
    {
      k: 'xlsx',
      label: 'Backlog Excel',
      ext: '.xlsx',
      desc: ru ? 'Бэклог для импорта в Excel / Google Sheets' : 'Backlog for Excel / Google Sheets',
      on: hasClusters,
      download: () => clusters && api.downloadXlsx(clusters, language),
    },
    {
      k: 'csv',
      label: 'Backlog CSV',
      ext: '.csv',
      desc: ru ? 'Простой CSV-бэклог' : 'Plain backlog CSV',
      on: hasClusters,
      download: () => clusters && api.downloadCsv(clusters, language),
    },
    {
      k: 'jira',
      label: 'Jira CSV',
      ext: '.csv',
      desc: ru ? 'Epic + Story для импорта через Jira CSV' : 'Epic + Story rows for Jira CSV',
      on: hasClusters,
      download: () => clusters && api.downloadJira(clusters, language),
    },
    { k: 'notion', label: 'Notion', ext: '—', desc: ru ? 'Скоро' : 'Coming soon', on: false },
    { k: 'linear', label: 'Linear', ext: '—', desc: ru ? 'Скоро' : 'Coming soon', on: false },
  ]

  const current = formats.find(f => f.k === format) ?? formats[0]
  const previewBody = current.k === 'docx_summary'
    ? (summaryContent ?? (ru ? '— Summary ещё не сгенерирован —' : '— Summary not generated yet —'))
    : current.k === 'docx_prd'
      ? (prdContent ?? (ru ? '— PRD ещё не сгенерирован —' : '— PRD not generated yet —'))
      : buildTablePreview(clusters, language)

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        eyebrow="step 06"
        title={t('export_title')}
        subtitle={t('export_sub')}
        actions={
          <button className="btn btn-sm" onClick={() => setStep('prd')}>
            {ru ? 'Назад' : 'Back'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div
          className="max-w-[1100px] mx-auto grid gap-6"
          style={{ gridTemplateColumns: '1fr 380px' }}
        >
          {/* ── Left column ───────────────────────────────────────────────── */}
          <div>
            <div className="eyebrow mb-2.5">{ru ? 'Формат' : 'Format'}</div>
            <div className="grid grid-cols-2 gap-2.5">
              {formats.map(f => {
                const selected = format === f.k
                return (
                  <button
                    key={f.k}
                    onClick={() => f.on && setFormat(f.k)}
                    disabled={!f.on}
                    className={[
                      'text-left p-3.5 rounded-lg border transition-colors',
                      selected
                        ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-400 dark:border-brand-700'
                        : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800',
                      f.on
                        ? 'hover:border-neutral-400 dark:hover:border-neutral-600 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-semibold text-[14px]">{f.label}</span>
                      <span className="font-mono text-[11px] text-neutral-400">{f.ext}</span>
                    </div>
                    <div className="text-[12px] text-neutral-500 dark:text-neutral-400 leading-[1.4]">
                      {f.desc}
                    </div>
                    {!f.on && (f.k === 'notion' || f.k === 'linear') && (
                      <span className="pill mt-2 text-[10px]">{ru ? 'Скоро' : 'Coming soon'}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Include block */}
            <div className="mt-6">
              <div className="eyebrow mb-2.5">{ru ? 'Включить в экспорт' : 'Include'}</div>
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3.5 flex flex-col gap-1.5">
                {([
                  [ru ? 'PRD топ-кластера'                     : 'Top cluster PRD',              true ],
                  [ru ? 'RICE-таблица всех кластеров'           : 'RICE table of all clusters',   true ],
                  [ru ? 'Цитаты пользователей с источниками'    : 'User quotes with sources',     true ],
                  [ru ? 'Обоснования агента'                    : 'Agent reasoning',              false],
                  [ru ? 'Создать задачи на каждое требование'   : 'Create tasks per requirement', false],
                ] as [string, boolean][]).map(([label, defOn]) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer text-[13px] py-0.5">
                    <input
                      type="checkbox"
                      defaultChecked={defOn}
                      className="accent-brand-700 dark:accent-brand-400 w-3.5 h-3.5"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action row */}
            <div className="mt-5 flex gap-2">
              <button
                className="btn-primary gap-1.5"
                disabled={!current.on}
                onClick={() => current.download?.()}
              >
                <Send size={13} /> {ru ? 'Экспортировать' : 'Export'} {current.label}{current.ext}
              </button>
              <button
                className="btn gap-1.5"
                onClick={() => setStep(hasSummary ? 'summary' : 'generating_summary')}
              >
                <Doc size={13} /> {ru ? 'Открыть Summary' : 'Open Summary'}
              </button>
            </div>
          </div>

          {/* ── Right column: preview ─────────────────────────────────────── */}
          <aside
            className="self-start sticky top-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
            style={{ minHeight: 420 }}
          >
            <div className="eyebrow mb-2.5">
              {ru ? 'Превью' : 'Preview'} — {current.label}{current.ext}
            </div>
            <pre className="font-mono text-[11.5px] leading-[1.55] text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap m-0 max-h-[520px] overflow-y-auto">
{previewBody}
            </pre>
          </aside>
        </div>
      </div>
    </div>
  )
}

function buildTablePreview(clusters: import('../../types').Cluster[] | null, language: string): string {
  if (!clusters?.length) return '— no data —'
  const ru = language === 'ru'
  const sorted = sortByRice(clusters)
  const head = ru ? '# Приоритизированный бэклог\n\n' : '# Prioritized backlog\n\n'
  const lines = sorted.map((c, i) =>
    `${String(i + 1).padStart(2, '0')}  ${c.rice_score.toFixed(0).padStart(6, ' ')}  ${c.name}\n` +
    `    R ${c.rice.reach}  I ${c.rice.impact}  C ${c.rice.confidence}%  E ${c.rice.effort}${ru ? ' чел.-мес' : ' mo'}`
  ).join('\n\n')
  return head + lines
}
