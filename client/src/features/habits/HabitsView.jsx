import { Check, Info, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'

const groups = ['morning', 'afternoon', 'night', 'anytime']

export default function HabitsView({ habits, onComplete, onCreate, onDelete }) {
  const [open, setOpen] = useState(new Set())
  const [form, setForm] = useState({ name: '', targetPerDay: 1, cue: 'anytime', xp: 10 })
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      await onCreate({ ...form, targetPerDay: Number(form.targetPerDay), xp: Number(form.xp) })
      setForm({ name: '', targetPerDay: 1, cue: 'anytime', xp: 10 })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function toggle(id) {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="panel feature-panel">
      <div className="panel-heading">
        <div><h1>Healthy Habits</h1><p>Consistent actions define your character.</p></div>
      </div>
      <form className="inline-form habit-form" onSubmit={submit}>
        <input
          aria-label="Habit name"
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="New habit..."
          required
          value={form.name}
        />
        <select aria-label="Times per day" onChange={(event) => setForm({ ...form, targetPerDay: event.target.value })} value={form.targetPerDay}>
          {[1, 2, 3, 4, 5, 10].map((value) => <option key={value} value={value}>{value}/day</option>)}
        </select>
        <select aria-label="Time of day" onChange={(event) => setForm({ ...form, cue: event.target.value })} value={form.cue}>
          {groups.map((group) => <option key={group} value={group}>{capitalize(group)}</option>)}
        </select>
        <select aria-label="XP reward" onChange={(event) => setForm({ ...form, xp: event.target.value })} value={form.xp}>
          {[10, 15, 25].map((value) => <option key={value} value={value}>{value} XP</option>)}
        </select>
        <button aria-label="Add habit" className="icon-primary" type="submit"><Plus size={19} /></button>
      </form>
      {error && <p className="form-error">{error}</p>}

      <div className="habit-board">
        {groups.map((group) => {
          const grouped = habits.filter((habit) => habit.cue === group)
          return (
            <section className="habit-column" key={group}>
              <header><h2>{capitalize(group)}</h2><span>{grouped.length}</span></header>
              <div className="habit-column-scroll">
                {grouped.length === 0 && <p className="empty">No habits</p>}
                {grouped.map((habit) => (
                  <article className={`habit-card ${habit.done ? 'done' : ''}`} key={habit.id}>
                    <button
                      aria-label={`Complete ${habit.name}`}
                      className="habit-check"
                      disabled={habit.done}
                      onClick={() => onComplete(habit.id)}
                      type="button"
                    >
                      {habit.done ? <Check size={15} /> : <Plus size={15} />}
                    </button>
                    <div className="habit-card-main">
                      <strong>{habit.name}</strong>
                      <span>{habit.completedToday}/{habit.targetPerDay} today</span>
                      {open.has(habit.id) && (
                        <div className="habit-details">
                          <span>{habit.xp} XP each</span>
                          <span>{habit.streak} day streak</span>
                        </div>
                      )}
                    </div>
                    <div className="row-actions">
                      <button aria-label={`Details for ${habit.name}`} onClick={() => toggle(habit.id)} type="button">
                        {open.has(habit.id) ? <X size={14} /> : <Info size={14} />}
                      </button>
                      <button aria-label={`Delete ${habit.name}`} className="danger-icon" onClick={() => onDelete(habit.id)} type="button">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

function capitalize(value) {
  return value[0].toUpperCase() + value.slice(1)
}
