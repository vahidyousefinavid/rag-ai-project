import type { Session, Message } from '../hooks/useChat'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'
import LanguageSwitcher from './LanguageSwitcher'
import { useLanguage } from '../i18n/LanguageContext'

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
  const { t } = useLanguage()
  const isRTL = t.dir === 'rtl'

  const toggleArrow = sidebarOpen
    ? (isRTL ? '▶' : '◀')
    : (isRTL ? '◀' : '▶')

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Header */}
      <div
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        className="px-4 py-2.5 flex items-center gap-3 flex-shrink-0"
      >
        <button
          onClick={onToggleSidebar}
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors text-sm flex-shrink-0"
          title={sidebarOpen ? t.hideSidebar : t.showSidebar}
        >
          {toggleArrow}
        </button>

        <span style={{ color: 'var(--text-muted)' }} className="text-sm truncate flex-1 min-w-0">
          {session?.title && session.title !== 'New Chat' ? session.title : t.newConversation}
        </span>

        {!sidebarOpen && <LanguageSwitcher />}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!session ? (
          <div className="flex-1 flex items-center justify-center">
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">{t.loading}</p>
          </div>
        ) : messages.length === 0 && !loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-8 max-w-sm">
              <div
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <span style={{ color: 'var(--accent)' }} className="text-xl">✦</span>
              </div>
              <p style={{ color: 'var(--text)' }} className="text-sm font-medium mb-1">{t.appName}</p>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs">{t.askAnything}</p>
            </div>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}

        {loading && <TypingIndicator />}

        {error && (
          <div
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs"
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
