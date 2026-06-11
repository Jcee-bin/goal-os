import { Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { api } from '../../api/client'

export default function JarvisChat({ onRefresh }) {
  const [messages, setMessages] = useState([
    { role: 'jarvis', text: 'What do you need?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  async function send(e) {
    e.preventDefault()
    const message = input.trim()
    if (!message || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: message }])
    setLoading(true)

    try {
      const data = await api('/jarvis/chat', {
        method: 'POST',
        body: { message },
      })
      setMessages((prev) => [...prev, { role: 'jarvis', text: data.reply }])
      if (data.actionsExecuted?.length > 0) onRefresh?.()
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'jarvis', text: error.message }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="jarvis-chat">
      <div className="jarvis-messages">
        {messages.map((msg, i) => (
          <div className={`jarvis-msg ${msg.role}`} key={i}>
            {msg.role === 'jarvis' && <span className="jarvis-label">J</span>}
            <p>{msg.text}</p>
          </div>
        ))}
        {loading && (
          <div className="jarvis-msg jarvis">
            <span className="jarvis-label">J</span>
            <p className="jarvis-typing">···</p>
          </div>
        )}
      </div>
      <form className="jarvis-input-row" onSubmit={send}>
        <input
          ref={inputRef}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Jarvis anything…"
          value={input}
        />
        <button disabled={loading || !input.trim()} type="submit">
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
