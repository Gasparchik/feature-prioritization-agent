import { useEffect, useRef } from 'react'
import { useAppStore } from './store'
import * as api from './api'

import { useGlobalHotkeys } from './components/agent/useGlobalHotkeys'
import Sidebar from './components/shell/Sidebar'
import AIStatusBar from './components/shell/AIStatusBar'
import AgentChat from './components/agent/AgentChat'
import SessionsDrawer from './components/sessions/SessionsDrawer'

import ShareView from './components/screens/ShareView'
import UploadScreen from './components/screens/UploadScreen'
import AnalyzingScreen from './components/screens/loading/AnalyzingScreen'
import ClustersScreen from './components/screens/ClustersScreen'
import RiceScreen from './components/screens/rice/RiceScreen'
import GeneratingPrdScreen from './components/screens/loading/GeneratingPrdScreen'
import PrdScreen from './components/screens/PrdScreen'
import GeneratingSummaryScreen from './components/screens/loading/GeneratingSummaryScreen'
import SummaryScreen from './components/screens/SummaryScreen'
import ExportScreen from './components/screens/ExportScreen'

export default function App() {
  const {
    step, language, feedbackList, clusters,
    totalIn, totalOut, prdContent, summaryContent,
    setClusters, setStep, setClusterUsage, setUsageTotals,
    setPrdContent, setSummaryContent, setStreaming,
    appendPhaseLog, clearPhaseLog, setAnalysisError,
    setFeedbackList, setSessionId,
    isShareView, setIsShareView, pushPrdHistory, setShareContentType,
    setAbortCtl, currentPrdClusterId, cachePrdContent,
  } = useAppStore()

  useGlobalHotkeys()

  // Load shared session from URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedId = params.get('session')
    if (!sharedId) return
    const isShare = params.get('share') === '1'
    window.history.replaceState(null, '', window.location.pathname)
    api.loadSessionData(sharedId).then(data => {
      if (!data) return
      if (data.feedback_list)   setFeedbackList(data.feedback_list)
      if (data.clusters)        setClusters(data.clusters)
      if (data.prd_content)     setPrdContent(data.prd_content)
      if (data.summary_content) setSummaryContent(data.summary_content)
      if (data.step)            setStep(data.step)
      setSessionId(sharedId)
      if (isShare) {
        setShareContentType((params.get('type') ?? 'prd') as 'prd' | 'summary')
        setIsShareView(true)
      }
    }).catch(() => {})
  }, [])

  const runningRef = useRef<string | null>(null)

  useEffect(() => {
    const loading = ['analyzing', 'generating_prd', 'generating_summary']
    if (!loading.includes(step)) return
    if (runningRef.current === step) return
    runningRef.current = step

    let cancelled = false

    const run = async () => {
      if (step === 'analyzing') {
        clearPhaseLog()
        try {
          for await (const event of api.streamCluster(feedbackList, language)) {
            if (cancelled) return
            if (event.phase && event.msg) {
              const now = new Date()
              const mm = String(now.getMinutes()).padStart(2, '0')
              const ss = String(now.getSeconds()).padStart(2, '0')
              appendPhaseLog({ t: `${mm}:${ss}`, tag: String(event.phase), msg: String(event.msg) })
            } else if (event.done && event.clusters) {
              const cls = event.clusters as import('./types').Cluster[]
              const usage = (event.usage ?? { input: 0, output: 0 }) as { input: number; output: number }
              setClusters(cls)
              setClusterUsage(usage)
              setUsageTotals(totalIn + usage.input, totalOut + usage.output)
              setStep('clusters')
            }
          }
        } catch (e) {
          console.error('Clustering error:', e)
          if (!cancelled) {
            const msg = e instanceof Error ? e.message : ''
            if (msg.startsWith('RATE_LIMIT:')) {
              const seconds = Number(msg.slice(11)) || 86400
              const h = Math.floor(seconds / 3600)
              const m = Math.floor((seconds % 3600) / 60)
              const isRu = language === 'ru'
              const when = h > 0
                ? (isRu ? `${h} ч ${m} мин` : `${h}h ${m}m`)
                : (isRu ? `${m} мин` : `${m}m`)
              setAnalysisError(isRu
                ? `Лимит запросов исчерпан. Следующий анализ доступен через ${when}.`
                : `Rate limit exceeded. Next analysis available in ${when}.`)
            }
            setStep('input')
          }
        }
      } else if (step === 'generating_prd' && clusters) {
        const baseIn = totalIn
        const baseOut = totalOut
        let content = ''
        if (prdContent) pushPrdHistory(prdContent)
        setPrdContent('')     // clear any previous content so loading screen shows
        setStreaming(true)
        const ctl = new AbortController()
        setAbortCtl(ctl)
        try {
          for await (const event of api.streamPrd(clusters, language, ctl.signal, currentPrdClusterId)) {
            if (cancelled) return
            if (typeof event.text === 'string') {
              content += event.text
              setPrdContent(content)  // routing switches to PrdScreen on first chunk
            } else if (event.done && event.usage) {
              const u = event.usage as { input: number; output: number }
              setUsageTotals(baseIn + u.input, baseOut + u.output)
              setStreaming(false)
            }
          }
          if (!cancelled) {
            // Persist the fully-generated PRD so a future switch back to this
            // cluster reuses the cached content instead of re-streaming.
            if (currentPrdClusterId !== null && content) {
              cachePrdContent(currentPrdClusterId, content)
            }
            setStep('prd')
          }
        } catch (e) {
          if (ctl.signal.aborted) return  // user stopped — step/streaming already reset by stopGeneration
          console.error('PRD generation error:', e)
          if (!cancelled) { setStreaming(false); setStep('clusters') }
        } finally {
          setAbortCtl(null)
        }
      } else if (step === 'generating_summary' && clusters) {
        const baseIn = totalIn
        const baseOut = totalOut
        let content = ''
        setSummaryContent('')  // clear so loading screen shows
        setStreaming(true)
        const ctl = new AbortController()
        setAbortCtl(ctl)
        try {
          for await (const event of api.streamSummary(clusters, language, ctl.signal)) {
            if (cancelled) return
            if (typeof event.text === 'string') {
              content += event.text
              setSummaryContent(content)  // routing switches to SummaryScreen on first chunk
            } else if (event.done && event.usage) {
              const u = event.usage as { input: number; output: number }
              setUsageTotals(baseIn + u.input, baseOut + u.output)
              setStreaming(false)
            }
          }
          if (!cancelled) setStep('summary')
        } catch (e) {
          if (ctl.signal.aborted) return  // user stopped — step/streaming already reset by stopGeneration
          console.error('Summary generation error:', e)
          if (!cancelled) { setStreaming(false); setStep('clusters') }
        } finally {
          setAbortCtl(null)
        }
      } else if ((step === 'generating_prd' || step === 'generating_summary') && !clusters) {
        if (!cancelled) setStep('clusters')
      }

      if (!cancelled) runningRef.current = null
    }

    run()

    return () => {
      cancelled = true
      runningRef.current = null
    }
  }, [step])

  if (isShareView) return <ShareView />

  // Show loading screen until first chunk, then switch to content screen mid-stream
  const showPrdLoading    = step === 'generating_prd'     && !prdContent
  const showPrdContent    = step === 'prd'                || (step === 'generating_prd'     && !!prdContent)
  const showSumLoading    = step === 'generating_summary' && !summaryContent
  const showSumContent    = step === 'summary'            || (step === 'generating_summary' && !!summaryContent)

  return (
    <div className="grid grid-cols-[240px_1fr] grid-rows-[1fr_auto] h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar — spans both rows */}
      <div className="row-span-2 min-h-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="overflow-hidden flex flex-col min-h-0 min-w-0">
        {step === 'input'          && <UploadScreen />}
        {step === 'analyzing'      && <AnalyzingScreen />}
        {(step === 'clusters' ||
          step === 'reclustering') && <ClustersScreen />}
        {step === 'rice'           && <RiceScreen />}
        {showPrdLoading            && <GeneratingPrdScreen />}
        {showPrdContent            && <PrdScreen />}
        {showSumLoading            && <GeneratingSummaryScreen />}
        {showSumContent            && <SummaryScreen />}
        {step === 'export'         && <ExportScreen />}
      </main>

      {/* Footer status bar */}
      <AIStatusBar />

      {/* Overlay drawers — fixed-positioned */}
      <AgentChat />
      <SessionsDrawer />
    </div>
  )
}
