import type { Session } from '../hooks/useChat'

interface Props {
  sessions: Session[]
  activeSession: Session | null
  onSelect: (session: Session) => void
  onNew: () => void
  onDelete: (id: string) => void
  open: boolean
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function SessionSidebar({ sessions, activeSession, onSelect, onNew, onDelete, open }: Props) {
  if (!open) return null

  return (
    <aside
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      className="w-56 flex-shrink-0 flex flex-col h-full"
    >
      {/* Header */}
      <div
        style={{ borderBottom: '1px solid var(--border)' }}
        className="px-3 py-3 flex items-center justify-between"
      >
        <span style={{ color: 'var(--text)' }} className="font-medium text-sm">RAG Chat</span>
        <button
          onClick={onNew}
          title="New chat"
          style={{ color: 'var(--text-muted)' }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-lg leading-none"
        >
          +
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }} className="px-3 py-4 text-xs text-center">
            No chats yet
          </p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s)}
            style={{
              background: activeSession?.id === s.id ? 'var(--surface-2)' : 'transparent',
              color: 'var(--text)',
            }}
            className="group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm leading-snug">
                {s.title || 'New Chat'}
              </p>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">
                {formatDate(s.createdAt)}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
              style={{ color: 'var(--text-muted)' }}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:text-red-400 transition-all flex-shrink-0 text-xs"
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
