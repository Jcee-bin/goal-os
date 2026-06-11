import { ArrowRight, Clock3, Flame, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { money } from '../../api/client'

const todayKey = () => `brief_dismissed_${new Date().toISOString().slice(0, 10)}`

export default function TodayBrief({ dashboard, finance, tasks }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(todayKey()) === '1')

  function dismiss() {
    localStorage.setItem(todayKey(), '1')
    setDismissed(true)
  }

  if (dismissed) return null
  const hour = new Date().getHours()
  const mode = hour >= 5 && hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'night'

  const habitsLeft = dashboard.habits.filter((h) => !h.done).length
  const nextHabit = dashboard.habits.find((h) => !h.done && h.cue === mode)
    ?? dashboard.habits.find((h) => !h.done)
  const nextTask = tasks.timed[0] ?? tasks.inbox.find((t) => t.priority === 'high')
  const budgetWarning = finance.pending > finance.safeToSpend * 0.5

  const next = nextHabit
    ? { label: nextHabit.name, meta: `${nextHabit.cue} habit` }
    : nextTask
      ? { label: nextTask.title, meta: nextTask.startTime ? formatTime(nextTask.startTime) : `${nextTask.priority} priority` }
      : null

  const today = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
    .format(new Date())

  return (
    <section className="today-brief">
      <button aria-label="Dismiss" className="brief-dismiss" onClick={dismiss} type="button"><X size={13} /></button>
      <div className="brief-top">
        <div className="brief-header">
          <span className="brief-mode">{mode}</span>
          <span className="brief-date">{today}</span>
        </div>
        <span className="brief-xp">+{dashboard.analytics.todayXp} XP</span>
      </div>

      <div className="brief-stats">
        {tasks.timed.length > 0 && (
          <span><Clock3 size={12} /> {tasks.timed.length} block{tasks.timed.length !== 1 ? 's' : ''}</span>
        )}
        {habitsLeft > 0 && (
          <span><Flame size={12} /> {habitsLeft} habit{habitsLeft !== 1 ? 's' : ''} left</span>
        )}
        {budgetWarning && (
          <span className="brief-warning"><TriangleAlert size={12} /> {money.format(finance.pending / 100)} to pay</span>
        )}
        {tasks.timed.length === 0 && habitsLeft === 0 && !budgetWarning && (
          <span className="brief-clear">All clear.</span>
        )}
      </div>

      {next && (
        <div className="brief-next">
          <ArrowRight size={13} />
          <span><strong>{next.label}</strong><em>{next.meta}</em></span>
        </div>
      )}
    </section>
  )
}

function formatTime(time) {
  const [hour, minute] = time.split(':').map(Number)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2026, 0, 1, hour, minute))
}
