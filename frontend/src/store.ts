import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Cluster, Language, LogLine, Step, Usage } from './types'

// ── helpers ──────────────────────────────────────────────────────────────────
export const riceScore = (r: number, i: number, c: number, e: number) =>
  e > 0 ? (r * i * (c / 100)) / e : 0

export const riceColor = (score: number): 'high' | 'med' | 'low' =>
  score >= 200 ? 'high' : score >= 80 ? 'med' : 'low'

// ── types ─────────────────────────────────────────────────────────────────────
export type Theme   = 'light' | 'dark'
export type Density = 'compact' | 'default' | 'comfortable'
export type Accent  = 'brand' | 'sage' | 'coral' | 'mono'
export type RiceView = 'table' | 'matrix'

interface AppState {
  // ── existing ──
  language: Language
  step: Step
  feedbackList: string[]
  clusters: Cluster[] | null
  clustersBackup: Cluster[] | null
  prdContent: string | null
  summaryContent: string | null
  sessionId: string | null
  showSessions: boolean
  showItems: Record<number, boolean>
  splitMode: Record<number, boolean>
  clusterUsage: Usage | null
  totalIn: number
  totalOut: number

  analysisError: string | null
  prdHistory: Array<{ content: string; ts: number }>
  isShareView: boolean
  shareContentType: 'prd' | 'summary'
  abortCtl: AbortController | null
  currentPrdClusterId: number | null
  prdCache: Record<number, string>

  // ── new UI state ──
  phaseLog: LogLine[]
  streaming: boolean
  view: RiceView
  selectedClusterId: number | null
  chatOpen: boolean
  sessionsDrawerOpen: boolean
  itemsExpanded: Record<number, boolean>
  splitSelection: Record<number, number[]>   // arrays (not Set) for persist
  theme: Theme
  density: Density
  accent: Accent

  // ── existing actions ──
  setLanguage: (lang: Language) => void
  setStep: (step: Step) => void
  setFeedbackList: (items: string[]) => void
  setClusters: (clusters: Cluster[]) => void
  appendClusters: (newClusters: Cluster[]) => void
  updateCluster: (id: number, updates: Partial<Cluster>) => void
  removeCluster: (id: number) => void
  saveUndo: () => void
  undo: () => void
  clearAll: () => void
  toggleShowItems: (id: number) => void
  toggleSplitMode: (id: number) => void
  setSessionId: (id: string | null) => void
  toggleSessions: () => void
  setClusterUsage: (usage: Usage) => void
  setUsageTotals: (inp: number, out: number) => void
  setPrdContent: (content: string) => void
  setSummaryContent: (content: string) => void

  setAnalysisError: (err: string | null) => void
  pushPrdHistory: (content: string) => void
  restorePrdVersion: (index: number) => void
  setIsShareView: (v: boolean) => void
  setShareContentType: (type: 'prd' | 'summary') => void
  setAbortCtl: (c: AbortController | null) => void
  stopGeneration: () => void
  setCurrentPrdClusterId: (id: number | null) => void
  selectPrdCluster: (clusterId: number) => void
  cachePrdContent: (clusterId: number, content: string) => void

  // ── new actions ──
  appendPhaseLog: (line: LogLine) => void
  clearPhaseLog: () => void
  setStreaming: (s: boolean) => void
  setView: (v: RiceView) => void
  setSelectedCluster: (id: number | null) => void
  setChatOpen: (open: boolean) => void
  setSessionsDrawerOpen: (open: boolean) => void
  toggleItemsExpanded: (id: number) => void
  toggleSplitItem: (clusterId: number, idx: number) => void
  clearSplitSelection: (id: number) => void
  commitSplit: (id: number) => void
  moveItem: (fromId: number, idx: number, toId: number) => void
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  setDensity: (d: Density) => void
  setAccent: (a: Accent) => void
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function applyDensity(density: Density) {
  const el = document.documentElement
  el.classList.remove('density-compact', 'density-comfortable')
  if (density !== 'default') el.classList.add(`density-${density}`)
}

function applyAccent(accent: Accent) {
  document.documentElement.setAttribute('data-accent', accent)
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── existing defaults ──
      language: 'en',
      step: 'input',
      feedbackList: [],
      clusters: null,
      clustersBackup: null,
      prdContent: null,
      summaryContent: null,
      sessionId: null,
      showSessions: false,
      showItems: {},
      splitMode: {},
      clusterUsage: null,
      totalIn: 0,
      totalOut: 0,

      analysisError: null,
      prdHistory: [],
      isShareView: false,
      shareContentType: 'prd',
      abortCtl: null,
      currentPrdClusterId: null,
      prdCache: {},

      // ── new defaults ──
      phaseLog: [],
      streaming: false,
      view: 'table',
      selectedClusterId: null,
      chatOpen: false,
      sessionsDrawerOpen: false,
      itemsExpanded: {},
      splitSelection: {},
      theme: (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light',
      density: 'default',
      accent: 'brand',

      // ── existing actions ──
      setLanguage: (language) => set({ language }),
      setStep: (step) => set({ step }),
      setFeedbackList: (feedbackList) => set({ feedbackList }),
      setClusters: (clusters) => set({ clusters }),
      appendClusters: (newClusters) => {
        const existing = get().clusters ?? []
        const maxId = existing.reduce((m, c) => Math.max(m, c.id), 0)
        const renumbered = newClusters.map((c, i) => ({ ...c, id: maxId + i + 1 }))
        set({ clusters: [...existing, ...renumbered] })
      },
      updateCluster: (id, updates) =>
        set((s) => ({
          clusters: s.clusters?.map((c) => c.id === id ? { ...c, ...updates } : c) ?? null,
        })),
      removeCluster: (id) =>
        set((s) => ({ clusters: s.clusters?.filter((c) => c.id !== id) ?? null })),
      saveUndo: () =>
        set((s) => ({ clustersBackup: s.clusters ? structuredClone(s.clusters) : null })),
      undo: () => set((s) => ({ clusters: s.clustersBackup, clustersBackup: null })),
      clearAll: () =>
        set({
          step: 'input', feedbackList: [], clusters: null, clustersBackup: null,
          prdContent: null, summaryContent: null, sessionId: null,
          showItems: {}, splitMode: {}, splitSelection: {},
          clusterUsage: null, totalIn: 0, totalOut: 0,
          selectedClusterId: null, chatOpen: false, prdHistory: [],
          currentPrdClusterId: null, prdCache: {},
        }),
      toggleShowItems: (id) =>
        set((s) => ({ showItems: { ...s.showItems, [id]: !s.showItems[id] } })),
      toggleSplitMode: (id) =>
        set((s) => ({ splitMode: { ...s.splitMode, [id]: !s.splitMode[id] } })),
      setSessionId: (sessionId) => set({ sessionId }),
      toggleSessions: () => set((s) => ({ showSessions: !s.showSessions })),
      setClusterUsage: (clusterUsage) => set({ clusterUsage }),
      setUsageTotals: (totalIn, totalOut) => set({ totalIn, totalOut }),
      setPrdContent: (prdContent) => set({ prdContent }),
      setSummaryContent: (summaryContent) => set({ summaryContent }),

      setAnalysisError: (analysisError) => set({ analysisError }),
      pushPrdHistory: (content) =>
        set((s) => ({ prdHistory: [{ content, ts: Date.now() }, ...s.prdHistory].slice(0, 10) })),
      restorePrdVersion: (index) =>
        set((s) => {
          if (index < 0 || index >= s.prdHistory.length) return {}
          const target = s.prdHistory[index]
          const currentSnapshot = s.prdContent
            ? [{ content: s.prdContent, ts: Date.now() }]
            : []
          const without = [...s.prdHistory.slice(0, index), ...s.prdHistory.slice(index + 1)]
          return {
            prdContent: target.content,
            prdHistory: [...currentSnapshot, ...without].slice(0, 10),
          }
        }),
      setIsShareView: (isShareView) => set({ isShareView }),
      setShareContentType: (shareContentType) => set({ shareContentType }),
      setAbortCtl: (abortCtl) => set({ abortCtl }),
      setCurrentPrdClusterId: (currentPrdClusterId) => set({ currentPrdClusterId }),
      // Switch to a cluster's PRD: loads cached content if we already have one,
      // otherwise shows the empty state so the user can hit Generate. Never
      // triggers generation by itself.
      selectPrdCluster: (clusterId) =>
        set((s) => ({
          currentPrdClusterId: clusterId,
          prdContent: s.prdCache[clusterId] ?? null,
        })),
      cachePrdContent: (clusterId, content) =>
        set((s) => ({
          prdCache: { ...s.prdCache, [clusterId]: content },
        })),
      stopGeneration: () => {
        const s = get()
        s.abortCtl?.abort()
        let fallback: Step = s.step
        if (s.step === 'generating_prd')     fallback = s.prdContent     ? 'prd'     : 'clusters'
        else if (s.step === 'generating_summary') fallback = s.summaryContent ? 'summary' : 'clusters'
        else if (s.step === 'analyzing')     fallback = 'input'
        set({ abortCtl: null, streaming: false, step: fallback })
      },

      // ── new actions ──
      appendPhaseLog: (line) => set((s) => ({ phaseLog: [...s.phaseLog, line] })),
      clearPhaseLog: () => set({ phaseLog: [] }),
      setStreaming: (streaming) => set({ streaming }),
      setView: (view) => set({ view }),
      setSelectedCluster: (selectedClusterId) => set({ selectedClusterId }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
      setSessionsDrawerOpen: (sessionsDrawerOpen) => set({ sessionsDrawerOpen }),

      toggleItemsExpanded: (id) =>
        set((s) => ({ itemsExpanded: { ...s.itemsExpanded, [id]: !s.itemsExpanded[id] } })),

      toggleSplitItem: (clusterId, idx) =>
        set((s) => {
          const arr = s.splitSelection[clusterId] ?? []
          const next = arr.includes(idx) ? arr.filter((i) => i !== idx) : [...arr, idx]
          return { splitSelection: { ...s.splitSelection, [clusterId]: next } }
        }),

      clearSplitSelection: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.splitSelection
          return { splitSelection: rest }
        }),

      commitSplit: (id) => {
        const { clusters, splitSelection, saveUndo, updateCluster, appendClusters,
                toggleSplitMode, clearSplitSelection } = get()
        const cluster = clusters?.find((c) => c.id === id)
        if (!cluster) return
        const sel = splitSelection[id] ?? []
        if (sel.length === 0 || sel.length === cluster.items.length) return

        saveUndo()
        const splitItems  = cluster.items.filter((_, i) => sel.includes(i))
        const remaining   = cluster.items.filter((_, i) => !sel.includes(i))
        const sr = splitItems.length  / cluster.items.length
        const or = remaining.length   / cluster.items.length
        const r  = cluster.rice

        const newCluster: Cluster = {
          id: Date.now(),
          name: cluster.name + ' (2)',
          description: cluster.description,
          items: splitItems,
          item_count: splitItems.length,
          rice: {
            ...r,
            reach: Math.max(1, Math.round(r.reach * sr)),
            reach_reasoning: 'Proportionally scaled.',
            effort: Math.max(0.5, Math.round(r.effort * sr * 2) / 2),
            effort_reasoning: 'Proportionally scaled.',
          },
          rice_score: 0,
        }
        newCluster.rice_score = riceScore(
          newCluster.rice.reach, newCluster.rice.impact,
          newCluster.rice.confidence, newCluster.rice.effort,
        )

        updateCluster(id, {
          items: remaining,
          item_count: remaining.length,
          rice: {
            ...r,
            reach: Math.max(1, Math.round(r.reach * or)),
            effort: Math.max(0.5, Math.round(r.effort * or * 2) / 2),
          },
          rice_score: riceScore(
            Math.max(1, Math.round(r.reach * or)), r.impact,
            r.confidence, Math.max(0.5, Math.round(r.effort * or * 2) / 2),
          ),
        })

        appendClusters([newCluster])
        toggleSplitMode(id)
        clearSplitSelection(id)
      },

      moveItem: (fromId, idx, toId) => {
        const { clusters, saveUndo, updateCluster } = get()
        const from = clusters?.find((c) => c.id === fromId)
        const to   = clusters?.find((c) => c.id === toId)
        if (!from || !to) return
        saveUndo()
        const item = from.items[idx]
        updateCluster(fromId, {
          items: from.items.filter((_, i) => i !== idx),
          item_count: Math.max(0, from.item_count - 1),
        })
        updateCluster(toId, {
          items: [...to.items, item],
          item_count: to.item_count + 1,
        })
      },

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyTheme(next)
      },
      setDensity: (density) => {
        set({ density })
        applyDensity(density)
      },
      setAccent: (accent) => {
        set({ accent })
        applyAccent(accent)
      },
    }),
    {
      name: 'fp-app-state',
      partialize: (s) => ({
        language:      s.language,
        // Never persist transient generation steps — a page refresh during
        // streaming must not auto-restart the generation. Fall back to a
        // stable equivalent based on what content is already in store.
        step:
          s.step === 'generating_prd'     ? (s.prdContent     ? 'prd'     : 'clusters') :
          s.step === 'generating_summary' ? (s.summaryContent ? 'summary' : 'clusters') :
          s.step === 'analyzing'          ? 'input' :
          s.step,
        feedbackList:  s.feedbackList,
        clusters:      s.clusters,
        prdContent:    s.prdContent,
        summaryContent: s.summaryContent,
        sessionId:     s.sessionId,
        view:          s.view,
        theme:         s.theme,
        density:       s.density,
        accent:        s.accent,
        currentPrdClusterId: s.currentPrdClusterId,
        prdCache:      s.prdCache,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        applyTheme(state.theme)
        applyDensity(state.density)
        applyAccent(state.accent)
        // Default the cache map for older persisted states that predate this field.
        if (!state.prdCache) state.prdCache = {}
        // Backfill cache from the legacy single-PRD field so an existing user's
        // generated PRD survives the migration to per-cluster caching.
        if (
          state.currentPrdClusterId !== null &&
          state.prdContent &&
          !state.prdCache[state.currentPrdClusterId]
        ) {
          state.prdCache[state.currentPrdClusterId] = state.prdContent
        }
      },
    }
  )
)
