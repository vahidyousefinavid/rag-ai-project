import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '../hooks/useChat'

interface Props {
  message: Message
  index: number
}

export default function MessageBubble({ message, index }: Props) {
  const isUser = message.role === 'user'
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const hasSources = !isUser && message.sources && message.sources.length > 0

  return (
    <div
      className="animate-fade-up flex gap-3 px-4 py-2"
      style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
    >
      {/* Role label */}
      <div className="w-6 flex-shrink-0 pt-0.5 text-right">
        <span style={{ color: isUser ? '#818cf8' : '#34d399' }} className="text-xs font-medium select-none">
          {isUser ? 'You' : 'AI'}
        </span>
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        <div
          style={{
            background: isUser ? 'var(--surface-2)' : 'transparent',
            border: isUser ? '1px solid var(--border)' : 'none',
            color: 'var(--text)',
          }}
          className={`rounded-lg ${isUser ? 'px-3 py-2' : 'py-1'}`}
        >
          <div className="prose text-sm">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Sources */}
        {hasSources && (
          <div className="mt-1.5">
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              style={{ color: 'var(--text-muted)' }}
              className="flex items-center gap-1 text-xs hover:text-white/70 transition-colors"
            >
              <span style={{ transform: sourcesOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>›</span>
              {message.sources!.length} source{message.sources!.length > 1 ? 's' : ''}
            </button>
            {sourcesOpen && (
              <div className="mt-1.5 flex flex-col gap-1">
                {message.sources!.map((src, i) => (
                  <div
                    key={i}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    className="px-2 py-1.5 rounded text-xs leading-relaxed"
                  >
                    {src}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
