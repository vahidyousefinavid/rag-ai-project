import useChat from './hooks/useChat'
import SessionSidebar from './components/SessionSidebar'
import ChatLayout from './components/ChatLayout'
import './index.css'

export default function App() {
  const {
    sessions,
    activeSession,
    messages,
    loading,
    error,
    sidebarOpen,
    setSidebarOpen,
    sendMessage,
    createSession,
    selectSession,
    deleteSession,
  } = useChat()

  return (
    <div className="flex h-full w-full">
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
    </div>
  )
}
