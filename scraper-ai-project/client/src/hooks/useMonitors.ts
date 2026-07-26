import { useState, useCallback, useRef } from 'react'

export type MonitorStatus = 'idle' | 'checking' | 'ready' | 'error'
export type SchedulePreset = 'hourly' | 'every6h' | 'daily' | 'weekly' | 'custom'
export type NotifyChannel = 'email' | 'telegram' | 'webhook' | 'sms'
/** 1 = fast/shallow, 2 = deep, 3 = maximum thoroughness — see backend CrawlerService LEVEL_CONFIGS. */
export type CrawlLevel = 1 | 2 | 3

export interface CompanyInfo {
  emails: string[]
  phones: string[]
  addresses: string[]
  socialLinks: { platform: string; url: string }[]
}

export interface NotifyConfig {
  email?: string
  telegramChatId?: string
  webhookUrl?: string
  smsPhone?: string
}

export interface ExtractionField {
  name: string
  selector: string
  attr?: string | null
}

export interface ExtractionSchema {
  itemSelector?: string | null
  fields: ExtractionField[]
}

export type DbSinkType = 'postgres' | 'mysql' | 'mongodb'
export type DbSinkMode = 'append' | 'replace' | 'upsert'

export interface DbSinkConfig {
  enabled: boolean
  type: DbSinkType
  host: string
  port: number
  user: string
  database: string
  table: string
  mode: DbSinkMode
  upsertKey?: string | null
  ssl?: boolean
  hasPassword: boolean
}

export interface MonitorTarget {
  id: string
  name: string
  url: string
  maxPages: number
  crawlLevel: CrawlLevel
  schedulePreset: SchedulePreset
  scheduleCron: string | null
  whatToCheck: string | null
  notifyChannels: NotifyChannel[]
  notifyConfig: NotifyConfig
  loginUrl: string | null
  loginUsername: string | null
  loginUsernameSelector: string | null
  loginPasswordSelector: string | null
  loginSubmitSelector: string | null
  hasLoginPassword: boolean
  extractionSchema: ExtractionSchema | null
  dbSink: DbSinkConfig | null
  agentGoal: string | null
  apiKeyPrefix: string | null
  hasApiKey: boolean
  status: MonitorStatus
  lastError: string | null
  lastDbSinkError: string | null
  lastExtractionWarning: string | null
  pageCount: number
  docCount: number
  companyInfo: CompanyInfo | null
  lastCheckedAt: string | null
  lastChangedAt: string | null
  nextRunAt: string | null
  createdAt: string
}

export interface MonitorRun {
  id: string
  targetId: string
  changed: boolean
  summary: string | null
  pagesChecked: number
  extractedCount: number
  error: string | null
  dbSinkError: string | null
  ranAt: string
}

export interface MonitorMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  sourceId?: string
}

export interface MonitorChatSession {
  id: string
  title: string | null
  createdAt: string
}

/** Form input shape for the DB-sink section — plaintext `password` in, never echoed back by the API. */
export interface DbSinkFormInput {
  enabled: boolean
  type: DbSinkType
  host: string
  port: number
  user: string
  password?: string
  database: string
  table: string
  mode: DbSinkMode
  upsertKey?: string
  ssl?: boolean
}

export interface MonitorFormDto {
  name: string
  url: string
  maxPages: number
  crawlLevel: CrawlLevel
  schedulePreset: SchedulePreset
  scheduleCron?: string | null
  whatToCheck?: string
  notifyChannels: NotifyChannel[]
  notifyConfig: NotifyConfig
  loginUrl?: string
  loginUsername?: string
  loginPassword?: string
  loginUsernameSelector?: string
  loginPasswordSelector?: string
  loginSubmitSelector?: string
  extractionSchema?: ExtractionSchema | null
  dbSink?: DbSinkFormInput | null
  agentGoal?: string | null
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    return data.message ?? fallback
  } catch {
    return fallback
  }
}

export function useMonitors() {
  const [targets,      setTargets]      = useState<MonitorTarget[]>([])
  const [messages,     setMessages]     = useState<MonitorMessage[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [sessionId,    setSessionId]    = useState<string | null>(null)
  const [chatSessions, setChatSessions] = useState<MonitorChatSession[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Monitor targets ─────────────────────────────────────────── */

  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch('/monitors')
      if (res.ok) setTargets(await res.json())
    } catch { /* silent */ }
  }, [])

  const createTarget = useCallback(async (dto: MonitorFormDto): Promise<MonitorTarget> => {
    const res = await fetch('/monitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    })
    if (!res.ok) throw new Error(await errorMessage(res, 'Create failed'))
    const target: MonitorTarget = await res.json()
    setTargets(s => [target, ...s])
    startPolling(target.id)
    return target
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateTarget = useCallback(async (id: string, dto: Partial<MonitorFormDto>): Promise<MonitorTarget> => {
    const res = await fetch(`/monitors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    })
    if (!res.ok) throw new Error(await errorMessage(res, 'Update failed'))
    const target: MonitorTarget = await res.json()
    setTargets(s => s.map(x => x.id === id ? target : x))
    return target
  }, [])

  const deleteTarget = useCallback(async (id: string) => {
    await fetch(`/monitors/${id}`, { method: 'DELETE' })
    setTargets(s => s.filter(x => x.id !== id))
  }, [])

  const generateApiKey = useCallback(async (id: string): Promise<string> => {
    const res = await fetch(`/monitors/${id}/api-key`, { method: 'POST' })
    if (!res.ok) throw new Error(await errorMessage(res, 'Failed to generate API key'))
    const data: { apiKey: string } = await res.json()
    setTargets(s => s.map(x => x.id === id ? { ...x, hasApiKey: true, apiKeyPrefix: data.apiKey.slice(0, 8) } : x))
    return data.apiKey
  }, [])

  const revokeApiKey = useCallback(async (id: string) => {
    await fetch(`/monitors/${id}/api-key`, { method: 'DELETE' })
    setTargets(s => s.map(x => x.id === id ? { ...x, hasApiKey: false, apiKeyPrefix: null } : x))
  }, [])

  const fetchDataPreview = useCallback(async (id: string): Promise<Record<string, any>[]> => {
    try {
      const res = await fetch(`/monitors/${id}/data/preview`)
      if (!res.ok) return []
      return await res.json()
    } catch { return [] }
  }, [])

  const testDbSink = useCallback(async (cfg: DbSinkFormInput): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/monitors/db-sink/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      return await res.json()
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }, [])

  /** Inserts a monitor the server already created (e.g. via the setup-wizard chat) into local state and starts polling it — mirrors what createTarget does after its own POST. */
  const adoptTarget = useCallback((target: MonitorTarget) => {
    setTargets(s => [target, ...s])
    startPolling(target.id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkNow = useCallback(async (id: string) => {
    await fetch(`/monitors/${id}/check-now`, { method: 'POST' })
    setTargets(s => s.map(x => x.id === id ? { ...x, status: 'checking' } : x))
    startPolling(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRuns = useCallback(async (id: string): Promise<MonitorRun[]> => {
    try {
      const res = await fetch(`/monitors/${id}/runs`)
      if (!res.ok) return []
      return await res.json()
    } catch { return [] }
  }, [])

  /* ── Poll target until ready/error ────────────────────────────── */

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/monitors')
        if (!res.ok) return
        const list: MonitorTarget[] = await res.json()
        setTargets(list)
        const target = list.find(t => t.id === id)
        if (!target || target.status === 'ready' || target.status === 'error') {
          clearInterval(pollRef.current!)
          pollRef.current = null
        }
      } catch { /* ignore */ }
    }, 2000)
  }

  /* ── Chat (multiple saved threads per monitor) ─────────────────── */

  const createChatSession = useCallback(async (sourceId?: string): Promise<MonitorChatSession> => {
    const res = await fetch('/sessions/by-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId }),
    })
    if (!res.ok) throw new Error('Failed to create chat')
    return res.json()
  }, [])

  const loadMessagesFor = useCallback(async (id: string, sourceId?: string) => {
    try {
      const res = await fetch(`/sessions/${id}/messages`)
      if (!res.ok) { setMessages([]); return }
      const msgs: { role: 'user' | 'assistant'; content: string; sources?: string[] | null }[] = await res.json()
      setMessages(msgs.map(m => ({ role: m.role, content: m.content, sources: m.sources ?? undefined, sourceId })))
    } catch { setMessages([]) }
  }, [])

  // Loads the saved chat threads for a monitor and opens the most recent one
  // (creating a first thread if none exist yet), so switching monitors or
  // reloading the page restores that monitor's conversations.
  const selectTarget = useCallback(async (sourceId?: string) => {
    setSessionId(null)
    setMessages([])
    setChatSessions([])
    try {
      const res = await fetch(`/sessions/by-source${sourceId ? `?sourceId=${sourceId}` : ''}`)
      if (!res.ok) return
      let list: MonitorChatSession[] = await res.json()
      if (list.length === 0) list = [await createChatSession(sourceId)]
      setChatSessions(list)
      setSessionId(list[0].id)
      await loadMessagesFor(list[0].id, sourceId)
    } catch { /* silent */ }
  }, [createChatSession, loadMessagesFor])

  const newChat = useCallback(async (sourceId?: string) => {
    try {
      const session = await createChatSession(sourceId)
      setChatSessions(s => [session, ...s])
      setSessionId(session.id)
      setMessages([])
    } catch { /* silent */ }
  }, [createChatSession])

  const selectChat = useCallback(async (id: string, sourceId?: string) => {
    setSessionId(id)
    setMessages([])
    await loadMessagesFor(id, sourceId)
  }, [loadMessagesFor])

  const deleteChat = useCallback(async (id: string, sourceId?: string) => {
    try { await fetch(`/sessions/${id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    const remaining = chatSessions.filter(c => c.id !== id)
    setChatSessions(remaining)
    if (id === sessionId) {
      if (remaining.length > 0) await selectChat(remaining[0].id, sourceId)
      else await newChat(sourceId)
    }
  }, [chatSessions, sessionId, selectChat, newChat])

  const ask = useCallback(async (question: string, sourceId?: string) => {
    const userMsg: MonitorMessage = { role: 'user', content: question, sourceId }
    setMessages(m => [...m, userMsg])
    setLoading(true)
    setError('')
    try {
      let sid = sessionId
      if (!sid) {
        const session = await createChatSession(sourceId)
        sid = session.id
        setSessionId(sid)
        setChatSessions(s => [session, ...s])
      }
      const res = await fetch(`/sessions/${sid}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      })
      if (!res.ok) throw new Error(await errorMessage(res, 'Request failed'))
      const data: { assistantMessage: { content: string; sources: string[] } } = await res.json()
      const aiMsg: MonitorMessage = {
        role: 'assistant',
        content: data.assistantMessage.content,
        sources: data.assistantMessage.sources,
        sourceId,
      }
      setMessages(m => [...m, aiMsg])
      setChatSessions(s => s.map(c => c.id === sid && (!c.title || c.title === 'چت جدید')
        ? { ...c, title: question.slice(0, 40) + (question.length > 40 ? '…' : '') }
        : c))
    } catch (err: any) {
      setError(err.message)
      setMessages(m => m.slice(0, -1)) // remove user msg on error
    } finally {
      setLoading(false)
    }
  }, [sessionId, createChatSession])

  const clearChat = useCallback(async () => {
    if (sessionId) {
      try { await fetch(`/sessions/${sessionId}/messages`, { method: 'DELETE' }) } catch { /* ignore */ }
    }
    setMessages([])
  }, [sessionId])

  return {
    targets, messages, loading, error, chatSessions, sessionId,
    fetchTargets, createTarget, adoptTarget, updateTarget, deleteTarget, checkNow, fetchRuns,
    generateApiKey, revokeApiKey, fetchDataPreview, testDbSink,
    ask, clearChat, selectTarget, newChat, selectChat, deleteChat,
  }
}
