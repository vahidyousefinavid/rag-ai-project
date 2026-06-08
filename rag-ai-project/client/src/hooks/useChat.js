import { useState } from "react"

export default function useChat() {

    const [messages, setMessages] = useState([{
        role: "assistant",
        content: "Hello! 👋 I'm your AI assistant. How can I help you today?"
    }])
    const [loading, setLoading] = useState(false)

    async function sendMessage(text) {

        const userMsg = {
            role: "user",
            content: text
        }

        setMessages(m => [...m, userMsg])
        setLoading(true)

        const res = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: text })
        })

        const data = await res.json()

        const aiMsg = {
            role: "assistant",
            content: data.answer
        }

        setMessages(m => [...m, aiMsg])
        setLoading(false)

    }

    return {
        messages,
        sendMessage,
        loading
    }

}
