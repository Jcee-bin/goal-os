import { Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'

export default function JarvisOverlay({ dashboard, onClose, onRefresh, open }) {
  const [messages, setMessages] = useState([
    { role: 'jarvis', text: 'All systems online. How can I assist?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [muted, setMuted] = useState(false)
  const inputRef = useRef(null)
  const threadRef = useRef(null)
  const recRef = useRef(null)

  // load voices on mount
  useEffect(() => {
    speechSynthesis.getVoices()
    speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices())
  }, [])

  // ESC to close
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // focus input + cancel speech on open/close
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
    } else {
      speechSynthesis.cancel()
      recRef.current?.stop()
      const resetState = setTimeout(() => {
        setSpeaking(false)
        setListening(false)
      }, 0)
      return () => clearTimeout(resetState)
    }
    return undefined
  }, [open])

  // auto-scroll thread
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages, loading])

  function speak(text) {
    if (muted) return
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = speechSynthesis.getVoices()
    utterance.voice =
      voices.find((v) => v.name === 'Google UK English Male') ??
      voices.find((v) => v.lang === 'en-GB' && !v.name.toLowerCase().includes('female')) ??
      voices.find((v) => v.lang.startsWith('en')) ??
      null
    utterance.rate = 1.15
    utterance.pitch = 0.85
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    speechSynthesis.speak(utterance)
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    speechSynthesis.cancel()
    setSpeaking(false)
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onresult = (e) => {
      setInput(e.results[0][0].transcript)
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  function stopListening() {
    recRef.current?.stop()
    setListening(false)
  }

  async function send(e) {
    e?.preventDefault()
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
      const reply = data.reply
      setMessages((prev) => [...prev, { role: 'jarvis', text: reply }])
      speak(reply)
      if (data.actionsExecuted?.length > 0) onRefresh?.()
    } catch (error) {
      const err = error.message
      setMessages((prev) => [...prev, { role: 'jarvis', text: err }])
      speak(err)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) send(e)
  }

  const state = listening ? 'LISTENING' : speaking ? 'SPEAKING' : loading ? 'PROCESSING' : 'READY'
  const productivity = dashboard?.analytics?.productivity ?? 0
  const habitsLeft = dashboard?.habits?.filter((h) => !h.done).length ?? 0
  const xpToday = dashboard?.analytics?.todayXp ?? 0

  if (!open) return null

  return (
    <div className="jov">
      <div className="jov-grid" />

      <header className="jov-header">
        <div>
          <span className="jov-wordmark">J·A·R·V·I·S</span>
          <span className="jov-sub">GOAL OS INTERFACE</span>
        </div>
        <div className="jov-controls">
          <button onClick={() => { setMuted((m) => !m); if (!muted) speechSynthesis.cancel() }} title={muted ? 'Unmute' : 'Mute'} type="button">
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button onClick={onClose} title="Close" type="button"><X size={15} /></button>
        </div>
      </header>

      <div className="jov-stats">
        <span><em>PRODUCTIVITY</em><strong>{productivity}%</strong></span>
        <i />
        <span><em>HABITS LEFT</em><strong>{habitsLeft}</strong></span>
        <i />
        <span><em>XP TODAY</em><strong>+{xpToday}</strong></span>
      </div>

      <div className="jov-body">
        <div className="jov-orb-zone">
          <div className={`jov-orb ${state.toLowerCase()}`}>
            <div className="jov-ring r3" />
            <div className="jov-ring r2" />
            <div className="jov-ring r1" />
            <div className="jov-core" />
          </div>
          <span className="jov-state">{state}</span>
        </div>

        <div className="jov-thread" ref={threadRef}>
          {messages.map((msg, i) => (
            <div className={`jmsg ${msg.role}`} key={i}>
              {msg.role === 'jarvis' && <span className="jmsg-badge">J</span>}
              <p>{msg.text}</p>
            </div>
          ))}
          {loading && (
            <div className="jmsg jarvis">
              <span className="jmsg-badge">J</span>
              <p className="jmsg-dots"><span /><span /><span /></p>
            </div>
          )}
        </div>
      </div>

      <footer className="jov-footer">
        <div className="jov-input">
          <input
            ref={inputRef}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={listening ? 'Listening…' : 'Give me a directive…'}
            value={input}
          />
          <button
            className={`jov-mic${listening ? ' active' : ''}`}
            onClick={listening ? stopListening : startListening}
            title={listening ? 'Stop listening' : 'Voice input'}
            type="button"
          >
            {listening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
          <button className="jov-send" disabled={!input.trim() || loading} onClick={send} type="button">›</button>
        </div>
      </footer>
    </div>
  )
}
