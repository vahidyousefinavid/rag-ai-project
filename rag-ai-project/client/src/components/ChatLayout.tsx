import type { Session, Message } from '../hooks/useChat'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'

interface Props {
  session: Session | null
  messages: Message[]
  loading: boolean
  error: string | null
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onSend: (text: string) => void
}

export default function ChatLayout({ session, messages, loading, error, sidebarOpen, onToggleSidebar, onSend }: Props) {
  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Header */}
      <div
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
      >
        <button
          onClick={onToggleSidebar}
          style={{ color: 'var(--text-muted)' }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-sm flex-shrink-0"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        <span style={{ color: 'var(--text)' }} className="text-sm font-medium truncate">
          {session?.title && session.title !== 'New Chat' ? session.title : 'New conversation'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!session ? (
          <div className="flex-1 flex items-center justify-center">
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">Loading…</p>
          </div>
        ) : messages.length === 0 && !loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Ask anything</p>
            </div>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}

        {loading && <TypingIndicator />}

        {error && (
          <div
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            className="mx-4 mb-2 px-3 py-2 rounded text-xs"
          >
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} loading={loading} />
    </div>
  )
}
