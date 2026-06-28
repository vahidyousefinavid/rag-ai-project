import { useState, useEffect, useRef } from 'react'
import useTasks from '../../hooks/useTasks'
import type { TaskStatus, TaskPriority } from '../../hooks/useTasks'

type Phase = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'ready'

interface Msg { role: 'user' | 'assistant'; text: string }

interface Action {
  type: 'create' | 'status' | 'priority' | 'delete' | 'none'
  title?: string
  priority?: TaskPriority
  status?: TaskStatus
}

interface Props { onClose: () => void }

// ── TTS ──────────────────────────────────────────────────────────────────────
async function speak(text: string, audioRef: React.MutableRefObject<HTMLAudioElement | null>): Promise<void> {
  audioRef.current?.pause()
  try {
    const res = await fetch('/api/speak', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return
    const url = URL.createObjectURL(await res.blob())
    return new Promise(resolve => {
      const a = new Audio(url)
      audioRef.current = a
      a.onended = () => { URL.revokeObjectURL(url); resolve() }
      a.onerror = () => { URL.revokeObjectURL(url); resolve() }
      a.play().catch(resolve)
    })
  } catch { /* non-fatal */ }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VoiceChat({ onClose }: Props) {
  const { tasks, addBulk, moveTask, updateTask, deleteTask, reload } = useTasks()
  const [phase, setPhase]     = useState<Phase>('idle')
  const [msgs, setMsgs]       = useState<Msg[]>([])
  const [error, setError]     = useState('')
  const [greeted, setGreeted] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const tasksRef  = useRef(tasks)
  tasksRef.current = tasks   // keep in sync without stale closure

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // Greet on first open (once)
  useEffect(() => {
    if (greeted) return
    setGreeted(true)
    const greet = 'سلام! دستیار تسکتم. چه کاری داری؟'
    setMsgs([{ role: 'assistant', text: greet }])
    setPhase('speaking')
    speak(greet, audioRef).then(() => setPhase('ready'))
  }, [])

  // ── Execute LLM actions ───────────────────────────────────────────────────
  const execActions = async (actions: Action[]) => {
    const current = tasksRef.current
    const find = (hint: string) =>
      current.find(t =>
        t.title.toLowerCase().includes(hint.toLowerCase()) ||
        hint.toLowerCase().includes(t.title.toLowerCase().slice(0, 8))
      )

    for (const a of actions) {
      if (a.type === 'create' && a.title) {
        await addBulk([{ title: a.title, priority: a.priority || 'medium' }])
      } else if (a.type === 'status' && a.title && a.status) {
        const t = find(a.title)
        if (t) await moveTask(t.id, a.status)
      } else if (a.type === 'priority' && a.title && a.priority) {
        const t = find(a.title)
        if (t) await updateTask(t.id, { priority: a.priority })
      } else if (a.type === 'delete' && a.title) {
        const t = find(a.title)
        if (t) await deleteTask(t.id)
      }
    }
    await reload()
  }

  // ── Conversation turn ─────────────────────────────────────────────────────
  const chat = async (userText: string) => {
    const nextMsgs: Msg[] = [...msgs, { role: 'user', text: userText }]
    setMsgs(nextMsgs)
    setPhase('thinking')

    try {
      const res = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: nextMsgs.slice(-10).map(m => ({ role: m.role, content: m.text })),
          tasks: tasksRef.current.map(t => ({
            id: t.id, title: t.title, status: t.status, priority: t.priority,
          })),
        }),
      })
      if (!res.ok) throw new Error()
      const { reply, actions } = await res.json()

      await execActions(actions || [])
      setMsgs(prev => [...prev, { role: 'assistant', text: reply }])
      setPhase('speaking')
      await speak(reply, audioRef)
      setPhase('ready')
    } catch {
      const err = 'مشکلی پیش اومد، دوباره امتحان کن.'
      setMsgs(prev => [...prev, { role: 'assistant', text: err }])
      setPhase('speaking')
      await speak(err, audioRef)
      setPhase('ready')
    }
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRec = async () => {
    setError('')
    audioRef.current?.pause()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        transcribeBlob(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
      mr.start()
      mediaRef.current = mr
      setPhase('recording')
    } catch {
      setError('دسترسی به میکروفون ممنوع است')
    }
  }

  const stopRec = () => {
    mediaRef.current?.stop()
    setPhase('transcribing')
  }

  const transcribeBlob = async (blob: Blob) => {
    setPhase('transcribing')
    try {
      const form = new FormData()
      form.append('file', blob, 'audio.webm')
      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      if (!res.ok) throw new Error()
      const { text } = await res.json()
      if (text.trim()) await chat(text.trim())
      else setPhase('ready')
    } catch {
      setPhase('ready')
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const canTap    = phase === 'ready' || phase === 'idle'
  const isRec     = phase === 'recording'
  const isBusy    = phase === 'transcribing' || phase === 'thinking'
  const isSpeaking = phase === 'speaking'

  const statusLabel =
    isRec        ? 'در حال ضبط… برای توقف بزن'  :
    isBusy       ? (phase === 'transcribing' ? 'در حال تبدیل صوت…' : 'در حال فکر کردن…') :
    isSpeaking   ? 'در حال صحبت…' :
    phase === 'ready' ? 'آماده‌ام — برای صحبت بزن 🎙' :
                   'بزن و شروع کن'

  const micColor =
    isRec      ? '#f87171' :
    canTap     ? '#7c3aed' :
    isSpeaking ? '#34d399' : '#3f3f46'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>🤖</div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14, margin: 0 }}>دستیار تسک</p>
          <p style={{ color: micColor, fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            {(isRec || canTap || isSpeaking) && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: micColor,
                display: 'inline-block', animation: 'pulse 1.2s infinite',
              }} />
            )}
            {statusLabel}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}
        >✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} dir="ltr">
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>🤖</div>
              )}
              <div style={{
                maxWidth: '74%',
                background: m.role === 'user' ? 'var(--surface-2)' : '#1a1040',
                border: `1px solid ${m.role === 'user' ? 'var(--border)' : '#3b2a6e'}`,
                borderRadius: m.role === 'user'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
                padding: '10px 14px',
                color: 'var(--text)',
                fontSize: 13,
                lineHeight: 1.65,
              }} dir="rtl">
                {m.text}
              </div>
              {m.role === 'user' && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>👤</div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isBusy && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>🤖</div>
              <div style={{
                background: '#1a1040', border: '1px solid #3b2a6e',
                borderRadius: '18px 18px 18px 4px', padding: '12px 16px',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                <span className="dot-1" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                <span className="dot-2" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                <span className="dot-3" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        padding: '20px 16px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        {error && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>}

        {/* Mic button */}
        <button
          onClick={isRec ? stopRec : (canTap ? startRec : undefined)}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: isRec ? 'rgba(248,113,113,0.12)' : canTap ? 'rgba(124,58,237,0.12)' : 'var(--surface-2)',
            border: `2.5px solid ${micColor}`,
            boxShadow: isRec
              ? '0 0 0 10px rgba(248,113,113,0.07), 0 0 0 20px rgba(248,113,113,0.04)'
              : canTap
              ? '0 0 0 10px rgba(124,58,237,0.07), 0 0 0 20px rgba(124,58,237,0.04)'
              : 'none',
            fontSize: 26, cursor: canTap || isRec ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {isRec ? '⏹' : isSpeaking ? '🔊' : isBusy ? '⟳' : '🎙'}
        </button>

        <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, textAlign: 'center' }} dir="rtl">
          {isRec
            ? 'برای توقف ضبط بزن'
            : canTap
            ? 'برای صحبت با دستیار بزن'
            : statusLabel}
        </p>
      </div>
    </div>
  )
}
