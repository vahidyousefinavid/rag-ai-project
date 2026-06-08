import ChatLayout from "./components/ChatLayout"
import useChat from "./hooks/useChat"
import "./index.css"

export default function App() {
  const { messages, sendMessage, loading, error } = useChat()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ChatLayout
        messages={messages}
        onSend={sendMessage}
        loading={loading}
        error={error}
      />
    </div>
  )
}