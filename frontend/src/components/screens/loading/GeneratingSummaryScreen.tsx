import { useAppStore } from '../../../store'
import { useT } from '../../../i18n'
import LoadingScreen from '../../ui/LoadingScreen'
import type { LogLine } from '../../ui/LoadingScreen'

const LOG: LogLine[] = [
  { t: '00:01', tag: 'init',    msg: 'Sorting clusters by RICE score' },
  { t: '00:03', tag: 'prompt',  msg: 'Constructing summary prompt (top 3 clusters)' },
  { t: '00:05', tag: 'stream',  msg: 'Streaming from claude-sonnet-4-6…' },
  { t: '00:12', tag: 'section', msg: 'Writing: Key findings and top priority' },
  { t: '00:22', tag: 'section', msg: 'Writing: Top 3 breakdown + sequencing' },
  { t: '00:32', tag: 'done',    msg: 'Summary ready' },
]

export default function GeneratingSummaryScreen() {
  const { language, stopGeneration } = useAppStore()
  const t = useT(language)
  return (
    <LoadingScreen
      eyebrow="step 04 → 05"
      title={t('generating_summary_title')}
      subtitle={t('generating_summary_sub')}
      log={LOG}
      estSec={35}
      onCancel={stopGeneration}
      cancelLabel={t('stop')}
    />
  )
}
