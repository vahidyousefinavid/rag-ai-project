import { useState, useEffect, useCallback } from 'react'

export interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[] | null
  createdAt?: string
}

export interface Session {
  id: string
  title: string | null
  createdAt: string
}

export default function useChat() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/sessions')
      if (!res.ok) throw new Error('Request failed')
      const data: Session[] = await res.json()
      if (!Array.isArray(data)) throw new Error('Unexpected response')
      setSessions(data)
      if (data.length > 0) {
        await selectSession(data[0])
      } else {
        await createSession()
      }
    } catch {
      setError('Failed to load sessions')
    }
  }, [])

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/sessions/${sessionId}/messages`)
      const data: Message[] = await res.json()
      setMessages(data)
    } catch {
      setError('Failed to load messages')
    }
  }, [])

  const selectSession = useCallback(async (session: Session) => {
    setActiveSession(session)
    setMessages([])
    await loadMessages(session.id)
  }, [loadMessages])

  const createSession = useCallback(async () => {
    try {
      const res = await fetch('/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      })
      const session: Session = await res.json()
      setSessions(prev => [session, ...prev])
      setActiveSession(session)
      setMessages([])
    } catch {
      setError('Failed to create session')
    }
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await fetch(`/sessions/${sessionId}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (activeSession?.id === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId)
        if (remaining.length > 0) {
          await selectSession(remaining[0])
        } else {
          await createSession()
        }
      }
    } catch {
      setError('Failed to delete session')
    }
  }, [activeSession, sessions, selectSession, createSession])

  const sendMessage = useCallback(async (text: string) => {
    if (!activeSession || !text.trim() || loading) return
    setError(null)

    const optimistic: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, optimistic])
    setLoading(true)

    try {
      const res = await fetch(`/sessions/${activeSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!res.ok) throw new Error('Request failed')

      const { userMessage, assistantMessage } = await res.json()

      // Replace optimistic with server messages and update session title
      setMessages(prev => [...prev.slice(0, -1), userMessage, assistantMessage])
      setSessions(prev =>
        prev.map(s =>
          s.id === activeSession.id
            ? { ...s, title: s.title === 'New Chat' || !s.title ? userMessage.content.slice(0, 40) : s.title }
            : s,
        ),
      )
    } catch {
      setMessages(prev => prev.slice(0, -1))
      setError('Failed to send message. Is the server running?')
    } finally {
      setLoading(false)
    }
  }, [activeSession, loading])

  return {
    sessions,
    activeSession,
    messages,
    loading,
    error,
    sidebarOpen,
    setSidebarOpen,
    sendMessage,
    createSession,
    selectSession,
    deleteSession,
  }
}
