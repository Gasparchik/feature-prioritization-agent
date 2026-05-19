import type { Cluster, SessionMeta } from './types'

const BASE = '/api'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function postBlob(path: string, body: unknown, filename: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  const blob = await res.blob()
  triggerDownload(blob, filename)
}

export async function uploadFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<
    | { type: 'items'; items: string[] }
    | { type: 'table'; columns: string[]; data: Record<string, string[]> }
  >
}

export async function clusterFeedback(feedback: string[], language: string) {
  const res = await fetch(`${BASE}/cluster`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback, language }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ clusters: Cluster[]; usage: { input: number; output: number } }>
}

export async function* streamCluster(feedback: string[], language: string) {
  const res = await fetch(`${BASE}/cluster/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback, language }),
  })
  if (!res.ok) {
    if (res.status === 429) {
      const seconds = res.headers.get('Retry-After') ?? '86400'
      throw new Error(`RATE_LIMIT:${seconds}`)
    }
    throw new Error(await res.text())
  }
  yield* parseSSE(res)
}

async function* parseSSE(response: Response): AsyncGenerator<Record<string, unknown>> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { yield JSON.parse(line.slice(6)) } catch { /* skip */ }
      }
    }
  }
}

export async function* streamPrd(clusters: Cluster[], language: string, signal?: AbortSignal, initiativeId?: number | null) {
  const res = await fetch(`${BASE}/prd/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clusters, language, initiative_id: initiativeId ?? null }),
    signal,
  })
  if (!res.ok) throw new Error(await res.text())
  yield* parseSSE(res)
}

export async function* streamSummary(clusters: Cluster[], language: string, signal?: AbortSignal) {
  const res = await fetch(`${BASE}/summary/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clusters, language }),
    signal,
  })
  if (!res.ok) throw new Error(await res.text())
  yield* parseSSE(res)
}

export const downloadDocx = (clusters: Cluster[], content: string, language: string) =>
  postBlob('/export/docx', { clusters, content, language }, 'feature_prd.docx')

export const downloadCsv = (clusters: Cluster[], language: string) =>
  postBlob('/export/csv', { clusters, language }, 'feature_backlog.csv')

export const downloadXlsx = (clusters: Cluster[], language: string) =>
  postBlob('/export/xlsx', { clusters, language }, 'feature_backlog.xlsx')

export const downloadJira = (clusters: Cluster[], language: string) =>
  postBlob('/export/jira', { clusters, language }, 'jira_import.csv')

export async function getSessions(): Promise<SessionMeta[]> {
  const res = await fetch(`${BASE}/sessions`)
  if (!res.ok) return []
  return res.json()
}

export async function saveSession(body: {
  language: string; step: string; feedback_list: string[]
  clusters?: Cluster[] | null; prd_content?: string | null; summary_content?: string | null
  session_id?: string | null; session_name?: string
}): Promise<string> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  const { id } = await res.json()
  return id
}

export async function renameSession(id: string, name: string) {
  await fetch(`${BASE}/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function deleteSession(id: string) {
  await fetch(`${BASE}/sessions/${id}`, { method: 'DELETE' })
}

export async function loadSessionData(id: string) {
  const res = await fetch(`${BASE}/sessions/${id}`)
  if (!res.ok) return null
  return res.json()
}
