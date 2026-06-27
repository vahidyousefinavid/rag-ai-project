import { useRef, useState } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'

type Phase = 'idle' | 'recording' | 'transcribing' | 'extracting' | 'preview'

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

export default function AudioRecorder({ onTasksReady }: Props) {
  const { t } = useLanguage()
  const [phase, setPhase]         = useState<Phase>('idle')
  const [transcript, setTranscript] = useState('')
  const [extracted, setExtracted] = useState<ExtractedTask[]>([])
  const [error, setError]         = useState<string | null>(null)
  const [open, setOpen]           = useState(false)

  const mediaRef   = useRef<MediaRecorder | null>(null)
  const chunksRef  = useRef<Blob[]>([])

  // ── Recording ──────────────────────────────────────────────────────────────

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
      setError('Microphone access denied')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setPhase('transcribing')
  }

  // ── Transcribe ─────────────────────────────────────────────────────────────

  const handleTranscribe = async (blob: Blob) => {
    setPhase('transcribing')
    try {
      const form = new FormData()
      form.append('file', blob, 'audio.webm')
      const res  = await fetch('/api/transcribe', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Transcription failed')
      const { text } = await res.json()
      setTranscript(text)
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
      setPhase('preview')
    } catch (e: any) {
      setError(e.message)
      setPhase('idle')
    }
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  const handleConfirm = () => {
    onTasksReady(extracted, transcript)
    setPhase('idle')
    setExtracted([])
    setTranscript('')
    setOpen(false)
  }

  const handleDiscard = () => {
    setPhase('idle')
    setExtracted([])
    setTranscript('')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative" dir="ltr">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: phase === 'recording' ? 'rgba(239,68,68,0.15)' : 'var(--surface-2)',
          border: `1px solid ${phase === 'recording' ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
          color: phase === 'recording' ? '#f87171' : 'var(--text-muted)',
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:text-white"
      >
        {phase === 'recording' ? (
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        ) : (
          <span>🎙</span>
        )}
        {t.record}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            minWidth: 320,
            maxWidth: 400,
          }}
          className="absolute top-full mt-2 end-0 rounded-2xl z-50 p-4 flex flex-col gap-3"
        >
          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              className="text-xs px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* IDLE — record button */}
          {phase === 'idle' && (
            <button
              onClick={startRecording}
              style={{ background: 'var(--accent)' }}
              className="w-full py-2.5 rounded-xl text-sm text-white font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            >
              <span>🎙</span> {t.record}
            </button>
          )}

          {/* RECORDING */}
          {phase === 'recording' && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                <span style={{ color: '#f87171' }} className="text-sm font-medium">{t.recording}</span>
              </div>
              <button
                onClick={stopRecording}
                style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}
                className="px-4 py-1.5 rounded-lg text-sm hover:bg-red-400/10 transition-colors"
              >
                {t.stopRecording}
              </button>
            </div>
          )}

          {/* TRANSCRIBING / EXTRACTING */}
          {(phase === 'transcribing' || phase === 'extracting') && (
            <div className="flex items-center gap-2 py-2">
              <span className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-purple-400 animate-spin" />
              <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                {phase === 'transcribing' ? t.transcribing : t.extracting}
              </span>
            </div>
          )}

          {/* PREVIEW — show extracted tasks */}
          {phase === 'preview' && (
            <div className="flex flex-col gap-3">
              {/* Transcript */}
              {transcript && (
                <div>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-1.5 font-medium">{t.transcribedText}</p>
                  <p style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    className="text-xs px-2.5 py-2 rounded-lg leading-relaxed max-h-20 overflow-y-auto">
                    {transcript}
                  </p>
                </div>
              )}

              {/* Extracted tasks */}
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-1.5 font-medium">
                  {t.extractedTasks} ({extracted.length})
                </p>
                {extracted.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs opacity-60">{t.noTasksExtracted}</p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                    {extracted.map((task, i) => (
                      <div
                        key={i}
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        className="px-2.5 py-2 rounded-lg flex items-start gap-2"
                      >
                        <span
                          style={{ background: PRIORITY_COLOR[task.priority] + '22', color: PRIORITY_COLOR[task.priority] }}
                          className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5"
                        >
                          {task.priority}
                        </span>
                        <div>
                          <p style={{ color: 'var(--text)' }} className="text-xs font-medium leading-snug">{task.title}</p>
                          {task.description && (
                            <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5 opacity-70">{task.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {extracted.length > 0 && (
                  <button
                    onClick={handleConfirm}
                    style={{ background: 'var(--accent)' }}
                    className="flex-1 py-2 rounded-xl text-sm text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    {t.addToBoard}
                  </button>
                )}
                <button
                  onClick={handleDiscard}
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  className="px-3 py-2 rounded-xl text-sm hover:bg-white/5 transition-colors"
                >
                  {extracted.length === 0 ? '← ' : ''}{t.discardExtracted}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
