import type { Session } from '../hooks/useChat'
import { useLanguage } from '../i18n/LanguageContext'
import type { Locale } from '../i18n'
import LanguageSwitcher from './LanguageSwitcher'

interface Props {
  sessions: Session[]
  activeSession: Session | null
  onSelect: (session: Session) => void
  onNew: () => void
  onDelete: (id: string) => void
  open: boolean
}

function formatDate(iso: string, locale: Locale, yesterday: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return yesterday
  if (diffDays < 7) return d.toLocaleDateString(locale, { weekday: 'short' })
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export default function SessionSidebar({ sessions, activeSession, onSelect, onNew, onDelete, open }: Props) {
  const { t, locale } = useLanguage()
  if (!open) return null

  return (
    <aside
      style={{ background: 'var(--surface)', borderInlineEnd: '1px solid var(--border)' }}
      className="w-56 flex-shrink-0 flex flex-col h-full"
    >
      {/* Header */}
      <div
        style={{ borderBottom: '1px solid var(--border)' }}
        className="px-3 py-3 flex items-center justify-between flex-shrink-0"
      >
        <span style={{ color: 'var(--text)' }} className="font-semibold text-sm tracking-tight truncate">
          {t.appName}
        </span>
        <button
          onClick={onNew}
          title={t.newChat}
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors text-base leading-none flex-shrink-0"
        >
          +
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1.5 px-1.5">
        {sessions.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }} className="px-2 py-6 text-xs text-center">
            {t.noChatsYet}
          </p>
        )}
        {sessions.map((s) => {
          const isActive = activeSession?.id === s.id
          return (
            <div
              key={s.id}
              onClick={() => onSelect(s)}
              style={{
                background: isActive ? 'var(--surface-2)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                borderInlineStart: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-white/5 hover:text-white transition-all mb-0.5"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium leading-snug" style={{ color: 'inherit' }}>
                  {s.title && s.title !== 'New Chat' ? s.title : t.newChatTitle}
                </p>
                <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5 opacity-70">
                  {formatDate(s.createdAt, locale, t.yesterday)}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
                style={{ color: 'var(--text-muted)' }}
                className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:text-red-400 transition-all flex-shrink-0 text-xs"
                title={t.delete}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer: language switcher */}
      <div
        style={{ borderTop: '1px solid var(--border)' }}
        className="px-3 py-2.5 flex-shrink-0 flex items-center justify-center"
      >
        <LanguageSwitcher />
      </div>
    </aside>
  )
}
