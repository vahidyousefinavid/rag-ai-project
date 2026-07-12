import { useRef, useState } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'

type Phase = 'idle' | 'recording' | 'transcribing' | 'extracting' | 'speaking' | 'preview' | 'listening'

interface ExtractedTask {
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
}

interface Props {
  onTasksReady: (tasks: ExtractedTask[], sourceText: string) => void
}

const PRIORITY_COLOR: Record<string, string> = {
  high:   '#f87171',
  medium: '#fbbf24',
  low:    '#60a5fa',
}

const toPersianNum = (n: number) =>
  n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])

export default function AudioRecorder({ onTasksReady }: Props) {
  const { t } = useLanguage()
  const [phase, setPhase]           = useState<Phase>('idle')
  const [transcript, setTranscript] = useState('')
  const [extracted, setExtracted]   = useState<ExtractedTask[]>([])
  const [error, setError]           = useState<string | null>(null)
  const [open, setOpen]             = useState(false)
  const [cmdText, setCmdText]       = useState('')

  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const taskCache = useRef<ExtractedTask[]>([])   // stable ref for async closures
  const srcCache  = useRef('')

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const playTTS = async (text: string): Promise<void> => {
    audioRef.current?.pause()
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      return new Promise(resolve => {
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => { URL.revokeObjectURL(url); resolve() }
        audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
        audio.play().catch(resolve)
      })
    } catch { /* TTS failure is non-fatal */ }
  }

  // ── Main recording ──────────────────────────────────────────────────────────
  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        handleTranscribe(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
      mr.start()
      mediaRef.current = mr
      setPhase('recording')
    } catch {
      setError('دسترسی به میکروفون ممنوع است')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setPhase('transcribing')
  }

  // ── Transcribe → Extract → Speak ────────────────────────────────────────────
  const handleTranscribe = async (blob: Blob) => {
    setPhase('transcribing')
    try {
      const form = new FormData()
      form.append('file', blob, 'audio.webm')
      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Transcription failed')
      const { text } = await res.json()
      setTranscript(text)
      srcCache.current = text
      await handleExtract(text)
    } catch (e: any) {
      setError(e.message)
      setPhase('idle')
    }
  }

  const handleExtract = async (text: string) => {
    setPhase('extracting')
    try {
      const res = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('Extraction failed')
      const { tasks } = await res.json()
      setExtracted(tasks)
      taskCache.current = tasks

      if (tasks.length === 0) {
        setPhase('preview')
        return
      }

      // Auto-speak summary
      setPhase('speaking')
      const msg =
        tasks.length === 1
          ? `یه تسک پیدا کردم: ${tasks[0].title}. اضافه‌ش کنم؟`
          : `${toPersianNum(tasks.length)} تسک پیدا کردم. اولیش: ${tasks[0].title}. اضافه‌شون کنم؟`
      await playTTS(msg)
      setPhase('preview')
    } catch (e: any) {
      setError(e.message)
      setPhase('idle')
    }
  }

  // ── Voice command ────────────────────────────────────────────────────────────
  const startVoiceCommand = async () => {
    audioRef.current?.pause()
    setError(null)
    setCmdText('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: Blob[] = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setPhase('transcribing')
        try {
          const form = new FormData()
          form.append('file', new Blob(chunks, { type: 'audio/webm' }), 'cmd.webm')
          const res = await fetch('/api/voice-intent', { method: 'POST', body: form })
          const { intent, text: cmd } = await res.json()
          setCmdText(cmd)
          await handleIntent(intent)
        } catch {
          setPhase('preview')
          await playTTS('مشکلی پیش اومد، دوباره امتحان کن.')
          setPhase('preview')
        }
      }
      mr.start()
      mediaRef.current = mr
      setPhase('listening')
    } catch {
      setError('دسترسی به میکروفون ممنوع است')
      setPhase('preview')
    }
  }

  const stopVoiceCommand = () => mediaRef.current?.stop()

  const handleIntent = async (intent: string) => {
    const tasks = taskCache.current
    switch (intent) {
      case 'confirm':
        setPhase('speaking')
        await playTTS(
          tasks.length === 1
            ? 'باشه، تسک ثبت شد.'
            : `باشه، ${toPersianNum(tasks.length)} تسک ثبت شد.`
        )
        handleConfirm()
        break

      case 'discard':
        setPhase('speaking')
        await playTTS('باشه، بیخیال شدم.')
        handleDiscard()
        break

      case 'read': {
        setPhase('speaking')
        const list = tasks
          .map((tk, i) => `${toPersianNum(i + 1)}. ${tk.title}`)
          .join('. ')
        await playTTS(`تسک‌ها: ${list}. اضافه‌شون کنم؟`)
        setPhase('preview')
        break
      }

      default:
        setPhase('speaking')
        await playTTS('متوجه نشدم. بگو آره برای اضافه کردن یا نه برای لغو.')
        setPhase('preview')
    }
  }

  // ── Confirm / Discard ────────────────────────────────────────────────────────
  const handleConfirm = () => {
    onTasksReady(taskCache.current, srcCache.current)
    setPhase('idle')
    setExtracted([])
    setTranscript('')
    setCmdText('')
    setOpen(false)
  }

  const handleDiscard = () => {
    setPhase('idle')
    setExtracted([])
    setTranscript('')
    setCmdText('')
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isActive     = phase === 'recording' || phase === 'listening'
  const isProcessing = phase === 'transcribing' || phase === 'extracting'
  const isSpeaking   = phase === 'speaking'

  const processingLabel =
    phase === 'transcribing' ? t.transcribing
    : phase === 'extracting' ? t.extracting
    : t.speaking

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative" dir="ltr">

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: isActive ? 'rgba(239,68,68,0.15)' : 'var(--surface-2)',
          border: `1px solid ${isActive ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
          color: isActive ? '#f87171' : isSpeaking ? '#34d399' : 'var(--text-muted)',
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:text-white"
      >
        {isActive    ? <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        : isSpeaking ? <span className="animate-pulse">🔊</span>
        :              <span>🎙</span>}
        {t.record}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            minWidth: 320, maxWidth: 400,
          }}
          className="absolute top-full mt-2 end-0 rounded-2xl z-50 p-4 flex flex-col gap-3"
        >
          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              className="text-xs px-3 py-2 rounded-lg">{error}</div>
          )}

          {/* ── IDLE ─────────────────────────────────────────────────── */}
          {phase === 'idle' && (
            <button onClick={startRecording}
              style={{ background: 'var(--accent)' }}
              className="w-full py-2.5 rounded-xl text-sm text-white font-medium hover:opacity-90 flex items-center justify-center gap-2">
              <span>🎙</span> {t.record}
            </button>
          )}

          {/* ── RECORDING ─────────────────────────────────────────────── */}
          {phase === 'recording' && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                <span style={{ color: '#f87171' }} className="text-sm font-medium">{t.recording}</span>
              </div>
              <button onClick={stopRecording}
                style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}
                className="px-4 py-1.5 rounded-lg text-sm hover:bg-red-400/10 transition-colors">
                {t.stopRecording}
              </button>
            </div>
          )}

          {/* ── PROCESSING / SPEAKING ────────────────────────────────── */}
          {(isProcessing || isSpeaking) && (
            <div className="flex items-center gap-2 py-2">
              {isSpeaking
                ? <span className="text-base animate-pulse">🔊</span>
                : <span className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-purple-400 animate-spin" />
              }
              <span style={{ color: 'var(--text-muted)' }} className="text-sm">{processingLabel}</span>
            </div>
          )}

          {/* ── LISTENING (voice command) ─────────────────────────────── */}
          {phase === 'listening' && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
                <span style={{ color: '#a78bfa' }} className="text-sm font-medium">{t.listening}</span>
              </div>
              <button onClick={stopVoiceCommand}
                style={{ border: '1px solid rgba(167,139,250,0.4)', color: '#a78bfa' }}
                className="px-4 py-1.5 rounded-lg text-sm hover:bg-purple-400/10 transition-colors">
                ✓ {t.stopListening}
              </button>
            </div>
          )}

          {/* ── PREVIEW ──────────────────────────────────────────────── */}
          {phase === 'preview' && (
            <div className="flex flex-col gap-3">

              {/* Transcript */}
              {transcript && (
                <div>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-1 font-medium">{t.transcribedText}</p>
                  <p style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    className="text-xs px-2.5 py-2 rounded-lg leading-relaxed max-h-16 overflow-y-auto" dir="rtl">
                    {transcript}
                  </p>
                </div>
              )}

              {/* Last voice command echo */}
              {cmdText && (
                <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 8 }}
                  className="px-2.5 py-1.5 flex items-center gap-1.5" dir="rtl">
                  <span style={{ color: '#a78bfa' }} className="text-xs">🎙</span>
                  <span style={{ color: 'var(--text-muted)' }} className="text-xs">{cmdText}</span>
                </div>
              )}

              {/* Extracted tasks list */}
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-1.5 font-medium">
                  {t.extractedTasks} ({extracted.length})
                </p>
                {extracted.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs opacity-60">{t.noTasksExtracted}</p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
                    {extracted.map((task, i) => (
                      <div key={i}
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        className="px-2.5 py-2 rounded-lg flex items-start gap-2">
                        <span
                          style={{ background: PRIORITY_COLOR[task.priority] + '22', color: PRIORITY_COLOR[task.priority] }}
                          className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5">
                          {task.priority}
                        </span>
                        <div>
                          <p style={{ color: 'var(--text)' }} className="text-xs font-medium leading-snug" dir="rtl">{task.title}</p>
                          {task.description && (
                            <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5 opacity-70" dir="rtl">{task.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice command hint */}
              {extracted.length > 0 && (
                <div
                  style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 10 }}
                  className="px-3 py-2 flex items-start gap-2" dir="rtl">
                  <span style={{ color: '#a78bfa' }}>💬</span>
                  <span style={{ color: 'var(--text-muted)' }} className="text-xs leading-relaxed">{t.voiceHint}</span>
                </div>
              )}

              {/* Action row */}
              <div className="flex gap-2">
                {/* Voice command mic */}
                {extracted.length > 0 && (
                  <button
                    onClick={startVoiceCommand}
                    title="پاسخ صوتی"
                    style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}
                    className="px-3 py-2 rounded-xl text-base hover:opacity-90 transition-opacity">
                    🎙
                  </button>
                )}
                {extracted.length > 0 && (
                  <button onClick={handleConfirm}
                    style={{ background: 'var(--accent)' }}
                    className="flex-1 py-2 rounded-xl text-sm text-white font-medium hover:opacity-90 transition-opacity">
                    {t.addToBoard}
                  </button>
                )}
                <button onClick={handleDiscard}
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  className="px-3 py-2 rounded-xl text-sm hover:bg-white/5 transition-colors">
                  {t.discardExtracted}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
