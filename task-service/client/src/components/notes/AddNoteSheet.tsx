import { useRef, useState } from 'react'
import type { NoteCategory } from '../../hooks/useNotes'
import { useLanguage } from '../../i18n/LanguageContext'
import { FF, L, rtlDir } from '../../lib/ui'

type Mode  = 'text' | 'voice'
type Phase = 'idle' | 'recording' | 'saving'

interface Props {
  onAddText: (content: string, category: NoteCategory) => Promise<void>
  onAddVoice: (blob: Blob, category: NoteCategory) => Promise<void>
  onClose: () => void
}

const CATEGORIES: { key: NoteCategory; label: [string, string, string]; color: string }[] = [
  { key: 'general',  label: ['روزمره', 'يومي', 'General'],       color: '#818cf8' },
  { key: 'site_log', label: ['گزارش کارگاه', 'تقرير الموقع', 'Site log'], color: '#7c3aed' },
  { key: 'labor',    label: ['دستمزد', 'أجور', 'Labor'],          color: '#fbbf24' },
  { key: 'purchase', label: ['خرید/ابزار', 'شراء/أدوات', 'Purchase'], color: '#34d399' },
  { key: 'expense',  label: ['هزینه', 'مصروفات', 'Expense'],       color: '#f87171' },
  { key: 'reminder', label: ['یادآوری', 'تذكير', 'Reminder'],      color: '#38bdf8' },
]

export default function AddNoteSheet({ onAddText, onAddVoice, onClose }: Props) {
  const { locale } = useLanguage()
  const dir = rtlDir(locale)
  const i18nIndex = locale === 'fa' ? 0 : locale === 'ar' ? 1 : 2

  const [mode, setMode]         = useState<Mode>('text')
  const [category, setCategory] = useState<NoteCategory>('general')
  const [content, setContent]   = useState('')
  const [phase, setPhase]       = useState<Phase>('idle')
  const [error, setError]       = useState('')

  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const saveText = async () => {
    const trimmed = content.trim()
    if (!trimmed) return
    setPhase('saving')
    try {
      await onAddText(trimmed, category)
      onClose()
    } catch {
      setError(L(locale, 'ذخیره نشد، دوباره امتحان کن.', 'فشل الحفظ.', 'Failed to save.'))
      setPhase('idle')
    }
  }

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setPhase('saving')
        try {
          await onAddVoice(new Blob(chunksRef.current, { type: 'audio/webm' }), category)
          onClose()
        } catch {
          setError(L(locale, 'ذخیره نشد، دوباره امتحان کن.', 'فشل الحفظ.', 'Failed to save.'))
          setPhase('idle')
        }
      }
      mr.start()
      mediaRef.current = mr
      setPhase('recording')
    } catch {
      setError(L(locale, 'دسترسی به میکروفون ممنوع است', 'تم رفض الوصول إلى الميكروفون', 'Microphone access denied'))
    }
  }

  const stopRecording = () => mediaRef.current?.stop()

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', background: 'var(--surface)',
          borderRadius: '20px 20px 0 0', padding: '20px 20px 32px',
          display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FF,
          border: '1px solid var(--border)', borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
        dir={dir}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', alignSelf: 'center' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {L(locale, 'یادداشت جدید', 'ملاحظة جديدة', 'New Note')}
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--surface-2)', borderRadius: 12, padding: 4 }}>
          {(['text', 'voice'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={phase !== 'idle'}
              style={{
                flex: 1, padding: '9px 6px', borderRadius: 9, border: 'none',
                background: mode === m ? '#7c3aed' : 'transparent',
                color: mode === m ? 'white' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: FF,
              }}
            >
              {m === 'text' ? L(locale, '📝 متن', '📝 نص', '📝 Text') : L(locale, '🎙 صدا', '🎙 صوت', '🎙 Voice')}
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${category === c.key ? c.color : 'var(--border)'}`,
                background: category === c.key ? c.color + '22' : 'var(--surface-2)',
                color: category === c.key ? c.color : 'var(--text-muted)',
                transition: 'all 0.15s', fontFamily: FF,
              }}
            >
              {c.label[i18nIndex]}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 12, padding: '8px 12px', borderRadius: 10 }}>
            {error}
          </div>
        )}

        {mode === 'text' ? (
          <>
            <textarea
              autoFocus
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={L(locale, 'یادداشت کوتاه یا بلند بنویس...', 'اكتب ملاحظة قصيرة أو طويلة...', 'Write a short or long note...')}
              rows={5}
              style={{
                width: '100%', border: '1px solid var(--border)', borderRadius: 12,
                padding: '12px', fontSize: 14, color: 'var(--text)', outline: 'none',
                background: 'var(--surface-2)', fontFamily: FF, resize: 'none', lineHeight: 1.6,
              }}
            />
            <button
              onClick={saveText}
              disabled={!content.trim() || phase === 'saving'}
              style={{
                background: content.trim() ? '#7c3aed' : 'var(--surface-2)',
                color: content.trim() ? 'white' : 'var(--text-muted)',
                border: 'none', borderRadius: 12, padding: '14px',
                fontSize: 14, fontWeight: 700, cursor: content.trim() ? 'pointer' : 'default',
                transition: 'background 0.2s', fontFamily: FF,
              }}
            >
              {phase === 'saving' ? L(locale, 'در حال ذخیره…', 'جارٍ الحفظ…', 'Saving…') : L(locale, 'ذخیره یادداشت', 'حفظ الملاحظة', 'Save Note')}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '12px 0' }}>
            {phase === 'recording' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171' }} className="dot-1" />
                <span style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>
                  {L(locale, 'در حال ضبط…', 'جارٍ التسجيل…', 'Recording…')}
                </span>
              </div>
            )}
            {phase === 'saving' && (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {L(locale, 'در حال رونویسی و ذخیره…', 'جارٍ النسخ والحفظ…', 'Transcribing & saving…')}
              </span>
            )}
            <button
              onClick={phase === 'recording' ? stopRecording : phase === 'idle' ? startRecording : undefined}
              disabled={phase === 'saving'}
              style={{
                width: 76, height: 76, borderRadius: '50%',
                background: phase === 'recording' ? 'rgba(248,113,113,0.12)' : 'rgba(124,58,237,0.12)',
                border: `2.5px solid ${phase === 'recording' ? '#f87171' : '#7c3aed'}`,
                fontSize: 28, cursor: phase === 'saving' ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s',
              }}
            >
              {phase === 'recording' ? '⏹' : phase === 'saving' ? '⟳' : '🎙'}
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, textAlign: 'center' }}>
              {phase === 'idle' ? L(locale, 'برای شروع ضبط بزن', 'اضغط لبدء التسجيل', 'Tap to start recording') : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
