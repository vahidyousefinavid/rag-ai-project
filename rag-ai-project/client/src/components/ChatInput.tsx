import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface Props {
  onSend: (text: string) => void
  loading: boolean
}

export default function ChatInput({ onSend, loading }: Props) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

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

  return (
    <div
      style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
      className="px-4 py-3 flex-shrink-0"
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={text}
          onChange={onInput}
          onKeyDown={onKeyDown}
          placeholder="Message… (Enter to send, Shift+Enter for newline)"
          disabled={loading}
          rows={1}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            minHeight: '36px',
            maxHeight: '120px',
            resize: 'none',
          }}
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600/60 transition-colors disabled:opacity-40 placeholder-zinc-600"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || loading}
          style={{ background: text.trim() && !loading ? 'var(--accent)' : 'var(--surface-2)', border: '1px solid var(--border)' }}
          className="h-9 w-9 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
          title="Send"
        >
          {loading
            ? <span className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
            : <span style={{ color: text.trim() ? '#fff' : 'var(--text-muted)' }} className="text-sm">↑</span>
          }
        </button>
      </div>
    </div>
  )
}
