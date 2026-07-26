import { useCallback, useState } from 'react'
import type { MonitorTarget } from './useMonitors'

export interface WizardMessage {
  role: 'user' | 'assistant'
  content: string
}

interface WizardTurnResponse {
  reply: string
  done: boolean
  monitor?: MonitorTarget
}

/** Drives the conversational monitor-setup wizard: stateless on the server, so the full message history is resent each turn. */
export function useMonitorWizard(greeting: string) {
  const [messages, setMessages] = useState<WizardMessage[]>([{ role: 'assistant', content: greeting }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdTarget, setCreatedTarget] = useState<MonitorTarget | null>(null)

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setError('')
    const history = messages
    const userMsg: WizardMessage = { role: 'user', content: text }
    setMessages(m => [...m, userMsg])
    setLoading(true)
    try {
      const res = await fetch('/monitors/wizard/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, message: text }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data: WizardTurnResponse = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
      if (data.done && data.monitor) setCreatedTarget(data.monitor)
    } catch {
      setError('ارتباط با دستیار برقرار نشد. دوباره تلاش کن.')
      setMessages(m => m.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }, [messages, loading])

  return { messages, loading, error, createdTarget, send }
}
