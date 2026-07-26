import { useState, useEffect, useRef, useCallback } from 'react'
import useTasks from '../../hooks/useTasks'
import type { TaskStatus, TaskPriority } from '../../hooks/useTasks'

type Phase = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'ready' | 'no_speech'

interface Msg { role: 'user' | 'assistant'; text: string }
interface Action {
  type: 'create' | 'status' | 'priority' | 'delete' | 'none'
  title?: string
  priority?: TaskPriority
  status?: TaskStatus
}
interface VoiceOption { id: string; name: string; gender: 'male' | 'female'; locale: string }
interface Props { onClose: () => void }

const VOICE_THRESHOLD  = 12
const SILENCE_AFTER_MS = 2200
const LS_VOICE_KEY     = 'tts_voice'
const DEFAULT_VOICE    = 'fa-IR-DilaraNeural'

// ── TTS ───────────────────────────────────────────────────────────────────────
async function tts(
  text: string,
  audioRef: React.MutableRefObject<HTMLAudioElement | null>,
  voice: string,
): Promise<void> {
  audioRef.current?.pause()
  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
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
  } catch { /* TTS failure is non-fatal */ }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceChat({ onClose }: Props) {
  const { tasks, addBulk, moveTask, updateTask, deleteTask, reload } = useTasks()

  const [phase, setPhase]           = useState<Phase>('idle')
  const [msgs, setMsgs]             = useState<Msg[]>([])
  const [volume, setVolume]         = useState(0)
  const [error, setError]           = useState('')
  const [voices, setVoices]         = useState<VoiceOption[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>(
    () => localStorage.getItem(LS_VOICE_KEY) || DEFAULT_VOICE
  )
  const [pickerOpen, setPickerOpen] = useState(false)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const mediaRef     = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const audioRef     = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef  = useRef<AudioContext | null>(null)
  const rafRef       = useRef<number | null>(null)
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSpeechRef = useRef(false)
  const tasksRef     = useRef(tasks)
  tasksRef.current   = tasks
  const voiceRef     = useRef(selectedVoice)
  voiceRef.current   = selectedVoice

  // ── Fetch voices ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/voices')
      .then(r => r.json())
      .then(d => setVoices(d.voices || []))
      .catch(() => {})
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, phase])

  // Change voice → persist + معرفی با صدای جدید
  const chooseVoice = useCallback((id: string) => {
    audioRef.current?.pause()   // صدای قبلی رو قطع کن
    localStorage.setItem(LS_VOICE_KEY, id)
    setSelectedVoice(id)
    setPickerOpen(false)
    const chosen = voices.find(v => v.id === id)
    const msg = `سلام! من ${chosen?.name ?? id} هستم. چه کاری داری؟`
    setMsgs([{ role: 'assistant', text: msg }])
    setPhase('speaking')
    tts(msg, audioRef, id).then(() => setPhase('ready'))
  }, [voices])

  // Greet on open — cleanup قطع صدا رو در StrictMode دوبار اجرا جلوگیری می‌کنه
  useEffect(() => {
    let cancelled = false
    const msg = 'سلام! دستیار تسکتم. چه کاری داری؟'
    setMsgs([{ role: 'assistant', text: msg }])
    setPhase('speaking')
    tts(msg, audioRef, voiceRef.current).then(() => {
      if (!cancelled) setPhase('ready')
    })
    return () => {
      cancelled = true
      audioRef.current?.pause()
    }
  }, [])

  // ── Volume monitor ────────────────────────────────────────────────────────
  const stopVolumeMonitor = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    if (silenceTimer.current) clearTimeout(silenceTimer.current)
    setVolume(0)
  }, [])

  const startVolumeMonitor = useCallback((stream: MediaStream, onAutoStop: () => void) => {
    try {
      const ctx      = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
      audioCtxRef.current  = ctx
      hasSpeechRef.current = false
      const data = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setVolume(avg)
        if (avg > VOICE_THRESHOLD) {
          hasSpeechRef.current = true
          if (silenceTimer.current) clearTimeout(silenceTimer.current)
          silenceTimer.current = setTimeout(onAutoStop, SILENCE_AFTER_MS)
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch { /* AudioContext not supported */ }
  }, [])

  // ── Execute LLM actions ───────────────────────────────────────────────────
  const execActions = useCallback(async (actions: Action[]) => {
    const find = (hint: string) => {
      const h = hint.toLowerCase()
      return tasksRef.current.find(t =>
        t.title.toLowerCase().includes(h) || h.includes(t.title.toLowerCase().slice(0, 10))
      )
    }
    for (const a of actions) {
      if (a.type === 'create' && a.title)
        await addBulk([{ title: a.title, priority: a.priority || 'medium' }])
      else if (a.type === 'status' && a.title && a.status) {
        const t = find(a.title); if (t) await moveTask(t.id, a.status)
      } else if (a.type === 'priority' && a.title && a.priority) {
        const t = find(a.title); if (t) await updateTask(t.id, { priority: a.priority })
      } else if (a.type === 'delete' && a.title) {
        const t = find(a.title); if (t) await deleteTask(t.id)
      }
    }
    await reload()
  }, [addBulk, moveTask, updateTask, deleteTask, reload])

  // ── Conversation turn ─────────────────────────────────────────────────────
  const chat = useCallback(async (userText: string) => {
    setMsgs(prev => [...prev, { role: 'user', text: userText }])
    setPhase('thinking')
    try {
      const res = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: msgs.slice(-10).map(m => ({ role: m.role, content: m.text })),
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
      await tts(reply, audioRef, voiceRef.current)
      setPhase('ready')
    } catch {
      const err = 'مشکلی پیش اومد، دوباره امتحان کن.'
      setMsgs(prev => [...prev, { role: 'assistant', text: err }])
      setPhase('speaking')
      await tts(err, audioRef, voiceRef.current)
      setPhase('ready')
    }
  }, [msgs, execActions])

  // ── Recording ─────────────────────────────────────────────────────────────
  const stopRec = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current)
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
    stopVolumeMonitor()
    setPhase('transcribing')
  }, [stopVolumeMonitor])

  const processAudio = useCallback(async (blob: Blob) => {
    try {
      const form = new FormData()
      form.append('file', blob, 'audio.webm')
      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      if (!res.ok) throw new Error()
      const { text, no_speech } = await res.json()
      if (no_speech || !text.trim()) {
        setPhase('no_speech')
        await tts('صداتو نشنیدم. دوباره امتحان کن.', audioRef, voiceRef.current)
        setPhase('ready')
      } else {
        await chat(text.trim())
      }
    } catch {
      setPhase('ready')
    }
  }, [chat])

  const startRec = useCallback(async () => {
    setError('')
    audioRef.current?.pause()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl:  true,
          channelCount:     { ideal: 1 },
          sampleRate:       { ideal: 16000 },
        },
      })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        processAudio(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
      mr.start(100)
      mediaRef.current = mr
      setPhase('recording')
      startVolumeMonitor(stream, stopRec)
    } catch {
      setError('دسترسی به میکروفون رد شد')
    }
  }, [startVolumeMonitor, stopRec, processAudio])

  // ── UI helpers ────────────────────────────────────────────────────────────
  const isRec      = phase === 'recording'
  const canTap     = phase === 'ready' || phase === 'idle'
  const isBusy     = phase === 'transcribing' || phase === 'thinking'
  const isSpeaking = phase === 'speaking'

  const micColor =
    isRec ? '#f87171' : canTap ? '#7c3aed' : isSpeaking ? '#34d399' : '#3f3f46'

  const statusLabel =
    isRec        ? 'در حال ضبط…' :
    phase === 'transcribing' ? 'تبدیل صوت…' :
    phase === 'thinking'     ? 'در حال فکر کردن…' :
    isSpeaking               ? 'در حال صحبت…' :
    phase === 'no_speech'    ? 'صداتو نشنیدم' :
    phase === 'ready'        ? 'آماده‌ام 🎙' :
    'شروع کن'

  const currentVoice = voices.find(v => v.id === selectedVoice)
  const voiceLabel   = currentVoice
    ? `${currentVoice.gender === 'female' ? '♀' : '♂'} ${currentVoice.name}`
    : '🔊 صدا'

  const volBars = [0.4, 0.7, 1.0, 0.7, 0.4].map((scale, i) => {
    const h = Math.max(3, Math.min(28, (volume / 90) * 28 * scale))
    return (
      <div key={i} style={{
        width: 4, borderRadius: 2, height: `${h}px`,
        background: volume > VOICE_THRESHOLD ? 'var(--accent)' : '#3f3f46',
        transition: 'height 0.07s ease-out, background 0.2s',
      }} />
    )
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column' }}
      onClick={() => pickerOpen && setPickerOpen(false)}
    >
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14, margin: 0 }}>دستیار تسک</p>
          <p style={{ color: micColor, fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            {(isRec || canTap || isSpeaking) && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: micColor, display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
            )}
            {statusLabel}
          </p>
        </div>

        {/* Voice picker button */}
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setPickerOpen(p => !p)}
            title="انتخاب صدا"
            style={{
              background: pickerOpen ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${pickerOpen ? 'var(--accent)' : 'var(--border)'}`,
              color: pickerOpen ? '#a78bfa' : 'var(--text-muted)',
              borderRadius: 8, padding: '4px 10px', fontSize: 11,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {voiceLabel}
          </button>

          {/* Dropdown */}
          {pickerOpen && voices.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, overflow: 'hidden', minWidth: 180,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 10,
            }}>
              {voices.map(v => (
                <button
                  key={v.id}
                  onClick={() => chooseVoice(v.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 14px', border: 'none', cursor: 'pointer',
                    background: v.id === selectedVoice ? 'rgba(124,58,237,0.15)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    color: v.id === selectedVoice ? '#a78bfa' : 'var(--text)',
                    textAlign: 'right',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: v.gender === 'female' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)',
                    border: `1.5px solid ${v.gender === 'female' ? '#ec4899' : '#3b82f6'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                  }}>
                    {v.gender === 'female' ? '👩' : '👨'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, direction: 'ltr' }}>{v.name}</p>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', direction: 'ltr' }}>
                      {v.gender === 'female' ? 'Female' : 'Male'} · {v.locale}
                    </p>
                  </div>
                  {v.id === selectedVoice && <span style={{ color: '#a78bfa', fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} dir="ltr">
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
              )}
              <div style={{
                maxWidth: '74%',
                background: m.role === 'user' ? 'var(--surface-2)' : '#1a1040',
                border: `1px solid ${m.role === 'user' ? 'var(--border)' : '#3b2a6e'}`,
                borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                padding: '10px 14px', color: 'var(--text)', fontSize: 13, lineHeight: 1.65,
              }} dir="rtl">
                {m.text}
              </div>
              {m.role === 'user' && (
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div>
              )}
            </div>
          ))}

          {/* Typing dots */}
          {isBusy && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
              <div style={{ background: '#1a1040', border: '1px solid #3b2a6e', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
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
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '18px 16px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {error && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>}

        {/* Volume bars */}
        <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 4, opacity: isRec ? 1 : 0, transition: 'opacity 0.3s' }}>
          {volBars}
        </div>

        {/* Mic button */}
        <button
          onClick={isRec ? stopRec : (canTap ? startRec : undefined)}
          disabled={!canTap && !isRec}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: isRec ? 'rgba(248,113,113,0.12)' : canTap ? 'rgba(124,58,237,0.12)' : 'var(--surface-2)',
            border: `2.5px solid ${micColor}`,
            boxShadow: isRec
              ? '0 0 0 10px rgba(248,113,113,0.07),0 0 0 22px rgba(248,113,113,0.03)'
              : canTap
              ? '0 0 0 10px rgba(124,58,237,0.07),0 0 0 22px rgba(124,58,237,0.03)'
              : 'none',
            fontSize: 26, cursor: canTap || isRec ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.25s',
          }}
        >
          {isRec ? '⏹' : isSpeaking ? '🔊' : isBusy ? '⟳' : '🎙'}
        </button>

        <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, textAlign: 'center' }} dir="rtl">
          {isRec ? 'بعد از صحبت، سکوت = توقف خودکار' : canTap ? 'برای صحبت با دستیار بزن' : statusLabel}
        </p>
      </div>
    </div>
  )
}
