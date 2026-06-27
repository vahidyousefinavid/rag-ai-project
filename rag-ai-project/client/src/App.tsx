import { useState } from 'react'
import useChat from './hooks/useChat'
import SessionSidebar from './components/SessionSidebar'
import ChatLayout from './components/ChatLayout'
import TasksPage from './pages/TasksPage'
import { useLanguage } from './i18n/LanguageContext'
import './index.css'

type View = 'chat' | 'tasks'

export default function App() {
  const [view, setView] = useState<View>('chat')
  const { t } = useLanguage()

  const {
    sessions, activeSession, messages, loading, error,
    sidebarOpen, setSidebarOpen,
    sendMessage, createSession, selectSession, deleteSession,
  } = useChat()

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top nav bar */}
      <nav
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0"
        dir="ltr"
      >
        {(['chat', 'tasks'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              color: view === v ? '#fff' : 'var(--text-muted)',
              background: view === v ? 'var(--surface-2)' : 'transparent',
              border: `1px solid ${view === v ? 'var(--border)' : 'transparent'}`,
            }}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:text-white"
          >
            {v === 'chat' ? t.navChat : t.navTasks}
          </button>
        ))}
      </nav>

      {/* Page content */}
      <div className="flex flex-1 min-h-0">
        {view === 'chat' ? (
          <>
            <SessionSidebar
              sessions={sessions}
              activeSession={activeSession}
              onSelect={selectSession}
              onNew={createSession}
              onDelete={deleteSession}
              open={sidebarOpen}
            />
            <ChatLayout
              session={activeSession}
              messages={messages}
              loading={loading}
              error={error}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onSend={sendMessage}
            />
          </>
        ) : (
          <TasksPage />
        )}
      </div>
    </div>
  )
}
