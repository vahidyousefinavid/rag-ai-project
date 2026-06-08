import { useState, useEffect } from "react"
import MessageList from "./MessageList"
import ChatInput from "./ChatInput"
import TypingIndicator from "./TypingIndicator"

export default function ChatLayout({ messages, onSend, loading, error }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className={`w-full max-w-5xl h-[90vh] bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10 transition-all duration-500 transform ${
      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
    }`}>
      {/* Header */}
      <div className="glass-effect px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse-slow">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg">AI Assistant</h1>
              <p className="text-gray-400 text-xs">Powered by Local AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-400 text-sm">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Typing Indicator */}
      {loading && <TypingIndicator />}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-fade-in">
          <p className="text-red-400 text-sm text-center flex items-center justify-center gap-2">
            <span>⚠️</span> {error}
          </p>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={onSend} loading={loading} />
    </div>
  )
}