import { useEffect, useRef } from "react"
import MessageBubble from "./MessageBubble"

export default function MessageList({ messages }) {
  const bottomRef = useRef()
  const containerRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
    >
      {messages.map((message, index) => (
        <MessageBubble 
          key={index} 
          message={message} 
          index={index}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}