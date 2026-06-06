import { useEffect, useMemo, useState } from 'react'
import './App.css'

const cueOrder = ['morning', 'afternoon', 'night', 'anytime']

function App() {
  const [state, setState] = useState(null)
  const [activeView, setActiveView] = useState('dashboard')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/state', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load Goal OS')
        return response.json()
      })
      .then(setState)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })

    return () => controller.abort()
  }, [])

  async function completeHabit(habitId) {
    const response = await fetch(`/api/habits/${habitId}/complete`, { method: 'POST' })
    if (!response.ok) return
    setState(await response.json())
  }

  const productivity = useMemo(() => {
    if (!state?.habits.length) return 0
    const target = state.habits.reduce((total, habit) => total + habit.targetPerDay, 0)
    const completed = state.habits.reduce(
      (total, habit) => total + Math.min(habit.completedToday, habit.targetPerDay),
      0,
    )
    return target ? Math.round((completed / target) * 100) : 0
  }, [state])

  if (error) return <main className="status-screen">{error}</main>
  if (!state) return <main className="status-screen">Loading Goal OS...</main>

  const level = Math.floor(state.profile.xp / 100) + 1
  const xpProgress = state.profile.xp % 100
  const doneHabits = state.habits.filter((habit) => habit.done).length

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">ID</span>
          <div>
            <strong>Goal OS</strong>
            <small>React conversion</small>
          </div>
        </div>
        <nav>
          {['dashboard', 'habits', 'identity'].map((view) => (
            <button
              className={activeView === view ? 'active' : ''}
              key={view}
              onClick={() => setActiveView(view)}
              type="button"
            >
              {view[0].toUpperCase() + view.slice(1)}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        {activeView === 'dashboard' && (
          <>
            <header className="identity-band">
              <div>
                <span>Current identity</span>
                <h1>{state.profile.identity}</h1>
              </div>
              <div className="level">
                <strong>Level {level}</strong>
                <span>{state.profile.xp} XP</span>
                <div className="track"><i style={{ width: `${xpProgress}%` }} /></div>
              </div>
            </header>

            <section className="stats">
              <article><span>Productive today</span><strong>{productivity}%</strong></article>
              <article><span>Habits</span><strong>{doneHabits}/{state.habits.length}</strong></article>
              <article><span>Goals</span><strong>{state.goals.length}</strong></article>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div><h2>Today&apos;s habits</h2><p>Small votes for your identity.</p></div>
                <button type="button" onClick={() => setActiveView('habits')}>View all</button>
              </div>
              <div className="habit-list">
                {state.habits.slice(0, 4).map((habit) => (
                  <HabitRow habit={habit} key={habit.id} onComplete={completeHabit} />
                ))}
              </div>
            </section>
          </>
        )}

        {activeView === 'habits' && (
          <section className="panel">
            <div className="panel-heading">
              <div><h1>Healthy Habits</h1><p>Daily actions grouped by time.</p></div>
            </div>
            <div className="habit-board">
              {cueOrder.map((cue) => (
                <section className="habit-column" key={cue}>
                  <h2>{cue[0].toUpperCase() + cue.slice(1)}</h2>
                  {state.habits
                    .filter((habit) => habit.cue === cue || (cue === 'night' && habit.cue === 'evening'))
                    .map((habit) => (
                      <HabitRow habit={habit} key={habit.id} onComplete={completeHabit} />
                    ))}
                </section>
              ))}
            </div>
          </section>
        )}

        {activeView === 'identity' && (
          <section className="panel identity-editor">
            <span>Identity setup migration is next</span>
            <h1>{state.profile.identity}</h1>
            <p>The backend already stores this profile. The edit form will move over in the next pass.</p>
          </section>
        )}
      </main>
    </div>
  )
}

function HabitRow({ habit, onComplete }) {
  return (
    <article className={`habit-row ${habit.done ? 'done' : ''}`}>
      <button disabled={habit.done} onClick={() => onComplete(habit.id)} type="button">
        {habit.done ? 'OK' : '+'}
      </button>
      <div>
        <strong>{habit.name}</strong>
        <span>{habit.completedToday}/{habit.targetPerDay} today, {habit.xp} XP</span>
      </div>
    </article>
  )
}

export default App
