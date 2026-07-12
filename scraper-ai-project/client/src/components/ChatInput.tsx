import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

interface Props {
  onSend: (text: string) => void
  loading: boolean
}

export default function ChatInput({ onSend, loading }: Props) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const { t } = useLanguage()

  useEffect(() => { ref.current?.focus() }, [])

  const submit = () => {
    if (!text.trim() || loading) return
    onSend(text.trim())
    setText('')
    if (ref.current) { ref.current.style.height = 'auto' }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const canSend = !!text.trim() && !loading

  return (
    <div
      style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
      className="px-4 py-3 flex-shrink-0"
    >
      <div
        style={{
          background: 'var(--surface-2)',
          border: `1px solid ${canSend ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
          borderRadius: '14px',
          transition: 'border-color 0.2s',
        }}
        className="flex items-end gap-2 px-3 py-2"
      >
        <textarea
          ref={ref}
          value={text}
          onChange={onInput}
          onKeyDown={onKeyDown}
          placeholder={t.messagePlaceholder}
          disabled={loading}
          rows={1}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text)',
            minHeight: '24px',
            maxHeight: '120px',
            resize: 'none',
          }}
          className="flex-1 text-sm outline-none disabled:opacity-40 placeholder-zinc-600 py-0.5"
        />
        <button
          onClick={submit}
          disabled={!canSend}
          style={{
            background: canSend ? 'var(--accent)' : 'var(--surface)',
            border: '1px solid var(--border)',
            transition: 'all 0.15s',
          }}
          className="h-7 w-7 flex-shrink-0 rounded-lg flex items-center justify-center disabled:opacity-30"
          title={t.send}
        >
          {loading
            ? <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
            : <span style={{ color: canSend ? '#fff' : 'var(--text-muted)' }} className="text-sm leading-none">↑</span>
          }
        </button>
      </div>
    </div>
  )
}
