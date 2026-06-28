import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import KanbanBoard from '../components/tasks/KanbanBoard'
import VoiceChat from '../components/tasks/VoiceChat'

export default function TasksPage() {
  const { t } = useLanguage()
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      {/* Header */}
      <div
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        className="px-4 py-2.5 flex items-center gap-3 flex-shrink-0"
      >
        <span style={{ color: 'var(--text)' }} className="text-sm font-semibold flex-1">
          {t.tasksTitle}
        </span>

        {/* دستیار صوتی */}
        <button
          onClick={() => setChatOpen(true)}
          style={{
            background: 'rgba(124,58,237,0.12)',
            border: '1px solid rgba(124,58,237,0.4)',
            color: '#a78bfa',
            borderRadius: 8, padding: '5px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          🤖 دستیار
        </button>

        <LanguageSwitcher />
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>

      {/* Voice chat overlay */}
      {chatOpen && <VoiceChat onClose={() => setChatOpen(false)} />}
    </div>
  )
}
