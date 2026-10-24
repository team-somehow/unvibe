import { parseLesson, type GeneratedLesson } from '../../shared/lesson'

export const DEFAULT_BRIDGE = 'http://127.0.0.1:4318'
const CONNECTION_KEY = 'unvibe.companion.connection'
export type Connection = { url: string; token: string }
export type CompanionStatus = {
  service: string
  version: string
  claude: { installed: boolean; authenticated: boolean; version?: string; message?: string }
  sessionCount: number
  queue: { active: number | string | null; waiting: number }
  rendering: { available: boolean }
  narration?: { available: boolean; provider: string }
}
export type LocalSession = { id: string; title: string; repo: string; updatedAt: string; messageCount: number }
export type SessionPreview = {
  session: LocalSession
  messages: { role: string; text: string }[]
  redactions: number
  truncated: boolean
  characters: number
  transcriptHash?: string
}
export type GenerationJob = {
  id: string
  sessionId: string
  provider: 'claude' | 'local'
  status: 'queued' | 'analyzing' | 'narrating' | 'rendering' | 'completed' | 'failed' | 'cancelled'
  stage: string
  progress: number
  createdAt: string
  updatedAt: string
  lesson?: GeneratedLesson
  error?: { code: string; message: string }
  video?: { url: string; mimeType: string; bytes: number }
  narration?: { status: string; provider?: string }
  provenance?: { providerLabel: string; transcriptMessages: number; redactions: number }
}

/** A loopback companion is the only supported destination for pairing credentials. */
export function normalizeBridge(raw: string) {
  const url = new URL(raw)
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  ) {
    throw new Error('Use a local companion address such as http://127.0.0.1:4318.')
  }
  return url.origin
}

export function initialConnection(): Connection {
  let connection = { url: DEFAULT_BRIDGE, token: '' }
  try {
    const saved = JSON.parse(sessionStorage.getItem(CONNECTION_KEY) ?? 'null')
    if (saved && typeof saved.url === 'string' && typeof saved.token === 'string')
      connection = { url: normalizeBridge(saved.url), token: saved.token }
    const fragment = new URLSearchParams(location.hash.slice(1))
    const token = fragment.get('token') ?? fragment.get('companionToken')
    if (token) {
      connection = { url: normalizeBridge(fragment.get('bridge') ?? DEFAULT_BRIDGE), token }
    }
  } catch {
    /* Invalid or unavailable session storage leaves the explicit pairing form usable. */
  }
  return connection
}
export function rememberConnection(connection: Connection) {
  try {
    sessionStorage.setItem(CONNECTION_KEY, JSON.stringify(connection))
  } catch {
    /* Session can still be used without persistence. */
  }
}
export function forgetConnection() {
  try {
    sessionStorage.removeItem(CONNECTION_KEY)
  } catch {
    /* Already disconnected. */
  }
}

export class CompanionClient {
  readonly connection: Connection
  constructor(connection: Connection) {
    this.connection = { url: normalizeBridge(connection.url), token: connection.token.trim() }
    if (!this.connection.token) throw new Error('Paste the connection token printed by your companion.')
  }
  async request<T>(path: string, init: RequestInit = {}, timeout = 15000): Promise<T> {
    const response = await this.fetch(path, init, timeout)
    return response.json() as Promise<T>
  }
  async fetch(path: string, init: RequestInit = {}, timeout = 15000) {
    if (!/^\/api\/[a-zA-Z0-9_/?=.-]+$/.test(path)) throw new Error('Invalid companion request.')
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), timeout)
    try {
      const response = await fetch(`${this.connection.url}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${this.connection.token}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? body?.error ?? `Companion request failed (${response.status}).`)
      }
      return response
    } catch (error) {
      if (error instanceof TypeError || (error instanceof DOMException && error.name === 'AbortError'))
        throw new Error(
          'Could not reach your companion. Keep npm run companion running, check the local address, and allow local network access if your browser asks.',
        )
      throw error
    } finally {
      window.clearTimeout(timer)
    }
  }
  status() {
    return this.request<CompanionStatus>('/api/status', {}, 30000)
  }
  sessions() {
    return this.request<{ sessions: LocalSession[] }>('/api/sessions')
  }
  preview(id: string) {
    return this.request<SessionPreview>(`/api/sessions/${encodeURIComponent(id)}/preview`)
  }
  jobs() {
    return this.request<{ jobs: GenerationJob[] }>('/api/jobs')
  }
  create(sessionId: string, options: { provider: 'claude' | 'local'; narrate: boolean; render: boolean; transcriptHash?: string }) {
    return this.request<GenerationJob>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        provider: options.provider,
        narrate: options.narrate,
        render: options.render,
        expectedTranscriptHash: options.transcriptHash,
      }),
    }).then((job) => ({ job }))
  }
  cancel(id: string) {
    return this.request(`/api/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: '{}' })
  }
  render(id: string) {
    return this.request<GenerationJob>(`/api/jobs/${encodeURIComponent(id)}/render`, { method: 'POST', body: '{}' }).then((job) => ({
      job,
    }))
  }
  async playableLesson(job: GenerationJob) {
    if (!job.lesson) throw new Error('This job has no completed lesson yet.')
    const lesson = parseLesson(job.lesson)
    if (!lesson.narration) return lesson
    const response = await this.fetch(`/api/jobs/${encodeURIComponent(job.id)}/audio`, {}, 30000)
    const blob = await response.blob()
    if (blob.size > 6 * 1024 * 1024) throw new Error('This audio file is too large for the local library. Export the MP4 instead.')
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not load this narration.'))
      reader.readAsDataURL(blob)
    })
    return parseLesson({ ...lesson, narration: { ...lesson.narration, audioUrl: data } })
  }
  async download(job: GenerationJob) {
    const response = await this.fetch(`/api/jobs/${encodeURIComponent(job.id)}/video`, {}, 60000)
    const url = URL.createObjectURL(await response.blob())
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${(job.lesson?.title ?? 'unvibe-reel').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80)}.mp4`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
}
