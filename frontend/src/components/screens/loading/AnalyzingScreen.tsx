import { useAppStore } from '../../../store'
import { useT } from '../../../i18n'
import LoadingScreen from '../../ui/LoadingScreen'
import type { LogLine } from '../../ui/LoadingScreen'

const FALLBACK_LOG: LogLine[] = [
  { t: '00:01', tag: 'ingest',  msg: 'Loading uploaded feedback items' },
  { t: '00:03', tag: 'clean',   msg: 'Removing duplicates and noise' },
  { t: '00:10', tag: 'embed',   msg: 'Vectorizing items with embeddings' },
  { t: '00:24', tag: 'cluster', msg: 'Running HDBSCAN clustering algorithm' },
  { t: '00:38', tag: 'rice',    msg: 'Scoring each cluster with RICE + reasoning' },
  { t: '00:45', tag: 'rank',    msg: 'Ranking clusters by priority score' },
]

export default function AnalyzingScreen() {
  const { language, phaseLog } = useAppStore()
  const t = useT(language)
  return (
    <LoadingScreen
      eyebrow="step 01 → 02"
      title={t('analyzing_title')}
      subtitle={t('analyzing_sub')}
      log={FALLBACK_LOG}
      liveLog={phaseLog.length > 0 ? phaseLog : undefined}
      estSec={50}
    />
  )
}
