import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function GoalsView({ goals, onCreate, onDelete, onProgress }) {
  const [form, setForm] = useState({ name: '', target: '', unit: 'times', cadence: 'ongoing' })
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      await onCreate({ ...form, target: Number(form.target) })
      setForm({ name: '', target: '', unit: 'times', cadence: 'ongoing' })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <section className="panel feature-panel">
      <div className="panel-heading">
        <div><h1>Action Goals</h1><p>Measurable growth toward your targets.</p></div>
      </div>
      <form className="goal-form" onSubmit={submit}>
        <input aria-label="Goal name" onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Goal, e.g. workout four days" required value={form.name} />
        <input aria-label="Goal target" min="1" onChange={(event) => setForm({ ...form, target: event.target.value })} placeholder="Target" required type="number" value={form.target} />
        <select aria-label="Goal unit" onChange={(event) => setForm({ ...form, unit: event.target.value })} value={form.unit}>
          {['times', 'sessions', 'pages', 'tasks', 'minutes', 'hours'].map((unit) => <option key={unit}>{unit}</option>)}
        </select>
        <select aria-label="Goal cadence" onChange={(event) => setForm({ ...form, cadence: event.target.value })} value={form.cadence}>
          <option value="ongoing">Ongoing</option>
          <option value="weekly">Weekly reset</option>
        </select>
        <button className="primary-button" type="submit"><Plus size={17} /> Add goal</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="goal-list large">
        {goals.map((goal) => (
          <article className="goal-row" key={goal.id}>
            <div>
              <strong>{goal.name}</strong>
              <span>{goal.current}/{goal.target} {goal.unit} · {goal.cadence === 'weekly' ? 'weekly reset' : 'ongoing'}</span>
              <div className="track"><i style={{ width: `${goal.percent}%` }} /></div>
            </div>
            <strong className="goal-percent">{goal.percent}%</strong>
            <button disabled={goal.current >= goal.target} onClick={() => onProgress(goal.id)} type="button">+1</button>
            <button aria-label={`Delete ${goal.name}`} className="danger-icon" onClick={() => onDelete(goal.id)} type="button"><Trash2 size={16} /></button>
          </article>
        ))}
      </div>
    </section>
  )
}
