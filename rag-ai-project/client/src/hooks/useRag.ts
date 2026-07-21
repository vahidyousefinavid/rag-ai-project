import { useState, useCallback, useRef } from 'react'

export type SourceType   = 'postgres' | 'mysql' | 'mongodb' | 'file'
export type SourceStatus = 'idle' | 'indexing' | 'ready' | 'error'

export interface RagSource {
  id: string
  name: string
  sourceType: SourceType
  config: Record<string, any>
  status: SourceStatus
  docCount: number
  totalChunks: number | null
  lastError: string | null
  createdAt: string
}

export interface RagMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  sourceId?: string
}

export interface RagChatSession {
  id: string
  title: string | null
  createdAt: string
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    return data.message ?? fallback
  } catch {
    return fallback
  }
}

export function useRag() {
  const [sources,      setSources]      = useState<RagSource[]>([])
  const [messages,     setMessages]     = useState<RagMessage[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [sessionId,    setSessionId]    = useState<string | null>(null)
  const [chatSessions, setChatSessions] = useState<RagChatSession[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Source list ─────────────────────────────────────────────── */

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/sources')
      if (!res.ok) return
      const list: RagSource[] = await res.json()
      setSources(list)
      // Picks up ingestion that's still running from before a page reload (or that the
      // backend auto-resumed after a restart) so progress keeps showing without a click.
      if (list.some(s => s.status === 'indexing')) startPolling()
    } catch { /* silent */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Create DB source ────────────────────────────────────────── */

  const createSource = useCallback(async (
    name: string,
    sourceType: SourceType,
    config: Record<string, any>,
  ): Promise<RagSource> => {
    const res = await fetch('/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sourceType, config }),
    })
    if (!res.ok) throw new Error(await errorMessage(res, 'Create failed'))
    const source: RagSource = await res.json()
    setSources(s => [source, ...s])
    return source
  }, [])

  /* ── Delete source ───────────────────────────────────────────── */

  const deleteSource = useCallback(async (id: string) => {
    await fetch(`/sources/${id}`, { method: 'DELETE' })
    setSources(s => s.filter(x => x.id !== id))
  }, [])

  /* ── Ingest DB source ────────────────────────────────────────── */

  const ingestSource = useCallback(async (id: string) => {
    await fetch(`/sources/${id}/ingest`, { method: 'POST' })
    setSources(s => s.map(x => x.id === id ? { ...x, status: 'indexing' } : x))
    startPolling()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Upload file ─────────────────────────────────────────────── */

  const uploadFile = useCallback(async (file: File, name: string): Promise<RagSource> => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name)
    const res = await fetch('/sources/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error(await errorMessage(res, 'Upload failed'))
    const source: RagSource = await res.json()
    setSources(s => [source, ...s])
    if (source.status === 'indexing') startPolling()
    return source
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Test DB connection ──────────────────────────────────────── */

  const testConnection = useCallback(async (
    sourceType: SourceType,
    config: Record<string, any>,
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/sources/connection/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType, config }),
    })
    return res.json()
  }, [])

  /* ── Poll while any source is indexing (progress + auto-stop) ─── */

  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/sources')
        if (!res.ok) return
        const list: RagSource[] = await res.json()
        setSources(list)
        if (!list.some(s => s.status === 'indexing')) {
          clearInterval(pollRef.current!)
          pollRef.current = null
        }
      } catch { /* ignore */ }
    }, 2000)
  }

  /* ── RAG chat (multiple saved threads per source) ──────────────── */

  const createChatSession = useCallback(async (sourceId?: string): Promise<RagChatSession> => {
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

  // Loads the saved chat threads for a source and opens the most recent one
  // (creating a first thread if none exist yet), so switching sources or
  // reloading the page restores that source's conversations.
  const selectSource = useCallback(async (sourceId?: string) => {
    setSessionId(null)
    setMessages([])
    setChatSessions([])
    try {
      const res = await fetch(`/sessions/by-source${sourceId ? `?sourceId=${sourceId}` : ''}`)
      if (!res.ok) return
      let list: RagChatSession[] = await res.json()
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
    const userMsg: RagMessage = { role: 'user', content: question, sourceId }
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
      const aiMsg: RagMessage = {
        role: 'assistant',
        content: data.assistantMessage.content,
        sources: data.assistantMessage.sources,
        sourceId,
      }
      setMessages(m => [...m, aiMsg])
      // Mirror the backend's auto-title (from the thread's first message) locally.
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
    sources, messages, loading, error, chatSessions, sessionId,
    fetchSources, createSource, deleteSource, ingestSource,
    uploadFile, testConnection, ask, clearChat,
    selectSource, newChat, selectChat, deleteChat,
  }
}
