import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import type { Message } from '../hooks/useChat'

export default function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {messages.map((msg, i) => (
        <MessageBubble key={msg.id ?? i} message={msg} index={i} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
