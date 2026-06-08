import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"

export default function MessageBubble({ message, index }) {
  const isUser = message.role === "user"
  const [copied, setCopied] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 50)
    return () => clearTimeout(timer)
  }, [index])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div 
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={`max-w-[80%] ${isUser ? "order-1" : "order-2"}`}>
        <div className={`relative group rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] ${
          isUser 
            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg" 
            : "glass-effect text-gray-100"
        }`}>
          {/* Avatar */}
          <div className={`absolute -top-8 ${isUser ? "right-0" : "left-0"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg ${
              isUser 
                ? "bg-gradient-to-r from-purple-500 to-pink-500" 
                : "bg-gradient-to-r from-blue-500 to-cyan-500"
            }`}>
              {isUser ? "👤" : "🤖"}
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none text-white">
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Copy Button for AI messages */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-white/10"
              title="Copy to clipboard"
            >
              {copied ? (
                <span className="text-green-400 text-xs">✓ Copied!</span>
              ) : (
                <span className="text-gray-400 text-xs">📋 Copy</span>
              )}
            </button>
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${
          isUser ? "text-right" : "text-left"
        }`}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}