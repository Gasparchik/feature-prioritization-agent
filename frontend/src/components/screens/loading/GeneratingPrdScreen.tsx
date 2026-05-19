import { useAppStore } from '../../../store'
import { useT } from '../../../i18n'
import LoadingScreen from '../../ui/LoadingScreen'
import type { LogLine } from '../../ui/LoadingScreen'

const LOG: LogLine[] = [
  { t: '00:01', tag: 'init',     msg: 'Loading top-priority cluster data' },
  { t: '00:03', tag: 'prompt',   msg: 'Constructing PRD generation prompt' },
  { t: '00:05', tag: 'stream',   msg: 'Streaming from claude-sonnet-4-6…' },
  { t: '00:15', tag: 'section',  msg: 'Writing: Overview + Problem statement' },
  { t: '00:28', tag: 'section',  msg: 'Writing: Goals, metrics, requirements' },
  { t: '00:45', tag: 'section',  msg: 'Writing: Risks, edge cases, open questions' },
  { t: '00:58', tag: 'done',     msg: 'PRD complete — reviewing output' },
]

export default function GeneratingPrdScreen() {
  const { language, stopGeneration } = useAppStore()
  const t = useT(language)
  return (
    <LoadingScreen
      eyebrow="step 03 → 04"
      title={t('generating_prd_title')}
      subtitle={t('generating_prd_sub')}
      log={LOG}
      estSec={65}
      onCancel={stopGeneration}
      cancelLabel={t('stop')}
    />
  )
}
