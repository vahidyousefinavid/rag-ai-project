import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '../hooks/useChat'
import { useLanguage } from '../i18n/LanguageContext'

interface Props {
  message: Message
  index: number
}

export default function MessageBubble({ message, index }: Props) {
  const isUser = message.role === 'user'
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const hasSources = !isUser && message.sources && message.sources.length > 0
  const { t } = useLanguage()
  const isRTL = t.dir === 'rtl'

  const expandIcon = isRTL ? '‹' : '›'

  return (
    <div
      className="animate-fade-up px-4 py-1.5"
      style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Role label */}
        <div className="flex items-center gap-1.5 mb-1">
          <span
            style={{
              color: isUser ? '#818cf8' : '#34d399',
              background: isUser ? 'rgba(129,140,248,0.1)' : 'rgba(52,211,153,0.1)',
              border: `1px solid ${isUser ? 'rgba(129,140,248,0.2)' : 'rgba(52,211,153,0.2)'}`,
            }}
            className="text-xs font-medium px-1.5 py-0.5 rounded select-none whitespace-nowrap"
          >
            {isUser ? t.you : t.ai}
          </span>
        </div>

        {/* Bubble */}
        <div
          style={{
            background: isUser ? 'var(--surface-2)' : 'transparent',
            border: isUser ? '1px solid var(--border)' : 'none',
            color: 'var(--text)',
            marginInlineStart: isUser ? '0' : '0.25rem',
          }}
          className={`rounded-xl ${isUser ? 'px-3.5 py-2.5' : 'py-0.5'}`}
        >
          <div className="prose text-sm leading-relaxed">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Sources */}
        {hasSources && (
          <div className="mt-2">
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              style={{ color: 'var(--text-muted)' }}
              className="flex items-center gap-1 text-xs hover:text-white/70 transition-colors"
            >
              <span
                style={{
                  display: 'inline-block',
                  transition: 'transform 0.15s',
                  transform: sourcesOpen ? 'rotate(90deg)' : (isRTL ? 'rotate(180deg)' : 'none'),
                }}
              >
                {expandIcon}
              </span>
              {t.sources(message.sources!.length)}
            </button>
            {sourcesOpen && (
              <div className="mt-1.5 flex flex-col gap-1">
                {message.sources!.map((src, i) => (
                  <div
                    key={i}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    className="px-2.5 py-1.5 rounded-lg text-xs leading-relaxed"
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
