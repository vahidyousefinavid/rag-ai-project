import { useState, useRef, useEffect } from "react"

export default function ChatInput({ onSend, loading }) {
  const [text, setText] = useState("")
  const inputRef = useRef(null)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (!text.trim() || loading) return
    onSend(text)
    setText("")
    setIsTyping(false)
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e) => {
    setText(e.target.value)
    setIsTyping(e.target.value.length > 0)
    
    // Auto-resize
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px"
  }

  return (
    <div className="glass-effect p-4 border-t border-white/10">
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Press Enter to send)"
            disabled={loading}
            rows={1}
            className="w-full bg-white/5 text-white placeholder-gray-400 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 disabled:opacity-50"
            style={{
              minHeight: "3rem",
              maxHeight: "8rem"
            }}
          />
          
          {/* Typing indicator dot */}
          {isTyping && !loading && (
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-2 ${
            !text.trim() || loading
              ? "bg-gray-600/50 cursor-not-allowed text-gray-400"
              : "bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:scale-105 active:scale-95 text-white"
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending
            </>
          ) : (
            <>
              <span>Send</span>
              <span>✨</span>
            </>
          )}
        </button>
      </div>
      
      {/* Character counter */}
      {text.length > 0 && (
        <div className="text-right mt-2 animate-fade-in">
          <span className={`text-xs ${text.length > 500 ? "text-red-400" : "text-gray-500"}`}>
            {text.length} / 500 characters
          </span>
        </div>
      )}
    </div>
  )
}