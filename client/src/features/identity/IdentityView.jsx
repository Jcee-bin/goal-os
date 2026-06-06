import { Save } from 'lucide-react'
import { useState } from 'react'

export default function IdentityView({ profile, onSave }) {
  const [form, setForm] = useState({
    identity: profile.identity,
    arena: profile.arena,
    identityConfirmed: true,
  })
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    try {
      await onSave(form)
      setMessage('Identity saved. +5 XP evidence added when it changes.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <section className="identity-layout">
      <div className="panel identity-copy">
        <span className="eyebrow">Identity-based change</span>
        <h1>Decide who you are becoming.</h1>
        <p>Every repeated action is evidence. Keep the statement specific enough to guide the next choice, but broad enough to grow with you.</p>
        <blockquote>“Every action is a vote for the person you wish to become.”</blockquote>
      </div>
      <form className="panel identity-form" onSubmit={submit}>
        <label>
          <span>Who are you becoming?</span>
          <textarea maxLength="240" onChange={(event) => setForm({ ...form, identity: event.target.value })} rows="5" value={form.identity} />
        </label>
        <label>
          <span>Primary arena</span>
          <input maxLength="80" onChange={(event) => setForm({ ...form, arena: event.target.value })} value={form.arena} />
        </label>
        <button className="primary-button" type="submit"><Save size={17} /> Save identity</button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  )
}
