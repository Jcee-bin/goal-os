import { ArrowRight, Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { money } from '../../api/client'
import TodayBrief from './TodayBrief'

const tips = [
  ['Make it obvious', 'Put the cue where your eyes already go. Shoes by the door, book on the desk, water beside the bed.'],
  ['Make it easy', 'Shrink the habit until starting feels almost too small to avoid. Two minutes still counts as a vote.'],
  ['Make it satisfying', 'Check it off, earn XP, and let the evidence log become the reward.'],
  ['Never miss twice', 'A missed day is data. Your next small repetition is the recovery plan.'],
]

export default function DashboardView({
  dashboard,
  finance,
  onCompleteHabit,
  onNavigate,
  onProgressGoal,
  tasks,
}) {
  const [tipIndex, setTipIndex] = useState(0)
  const { profile, habits, goals, evidence, analytics } = dashboard
  const level = Math.floor(profile.xp / 100) + 1
  const levelProgress = profile.xp % 100
  const milestone = profile.xp >= 1500
    ? 'Identity Architect'
    : profile.xp >= 1000
      ? 'Systems Builder'
      : profile.xp >= 500
        ? 'Master of Focus'
        : 'Foundation Builder'

  return (
    <>
      <TodayBrief dashboard={dashboard} finance={finance} tasks={tasks} />
      <header className="identity-band">
        <div>
          <span className="eyebrow">Current identity</span>
          <h1>{profile.identity}</h1>
          <button className="text-button" onClick={() => onNavigate('identity')} type="button">
            Edit identity <ArrowRight size={15} />
          </button>
        </div>
        <div className="level">
          <div><strong>Level {level}</strong><span>{profile.xp} XP</span></div>
          <div className="track"><i style={{ width: `${levelProgress}%` }} /></div>
          <small>{100 - levelProgress} XP to Level {level + 1}</small>
        </div>
      </header>

      <section className="dashboard-grid">
        <aside className="dashboard-rail">
          <section className="panel compact-panel">
            <div className="section-heading"><h2>Schedule</h2><span>{tasks.timed.length + tasks.anytime.length} today</span></div>
            <div className="schedule-preview">
              {tasks.overdue.length > 0 && <strong className="overdue-count">{tasks.overdue.length} overdue</strong>}
              {[...tasks.timed, ...tasks.anytime].slice(0, 3).map((task) => (
                <article key={task.id}>
                  <time>{task.startTime ? formatDashboardTime(task.startTime) : 'Anytime'}</time>
                  <span>{task.title}</span>
                </article>
              ))}
              {tasks.timed.length + tasks.anytime.length === 0 && <p className="empty">No tasks scheduled yet.</p>}
            </div>
            <button className="wide-secondary" onClick={() => onNavigate('today')} type="button">
              Open today
            </button>
          </section>

          <section className="panel compact-panel">
            <div className="section-heading"><h2>Today</h2><span>{dashboard.today}</span></div>
            <div className="today-stats">
              <article><span>Today&apos;s XP</span><strong>+{analytics.todayXp}</strong></article>
              <article><span>Habits</span><strong>{analytics.completedHabits}/{analytics.totalHabits}</strong></article>
              <article><span>Best streak</span><strong>{analytics.bestStreak}d</strong></article>
            </div>
            <div className="meter-block">
              <span>Productive meter</span>
              <strong>{analytics.productivity}%</strong>
              <div className="track"><i style={{ width: `${analytics.productivity}%` }} /></div>
            </div>
          </section>

          <section className="panel compact-panel">
            <div className="section-heading"><h2>Money</h2><span>Live ledger</span></div>
            <dl className="money-list">
              <div><dt>Safe to spend</dt><dd>{money.format(finance.safeToSpend / 100)}</dd></div>
              <div><dt>Current money</dt><dd>{money.format(finance.currentMoney / 100)}</dd></div>
              <div><dt>Savings</dt><dd>{money.format(finance.balances.savings / 100)}</dd></div>
              <div><dt>To pay</dt><dd>{money.format(finance.pending / 100)}</dd></div>
            </dl>
            <button className="wide-secondary" onClick={() => onNavigate('budget')} type="button">
              Open budget
            </button>
          </section>

          <section className="panel compact-panel evidence-panel">
            <div className="section-heading"><h2>Evidence log</h2><span>Latest proof</span></div>
            <div className="evidence-list">
              {evidence.length === 0 && <p className="empty">Complete a habit to create proof.</p>}
              {evidence.slice(0, 5).map((item) => (
                <article key={item.id}>
                  <strong>+{item.xpDelta} XP</strong>
                  <span>{item.description}</span>
                  <small>{item.eventOn}</small>
                </article>
              ))}
            </div>
          </section>

        </aside>

        <div className="dashboard-main">
          <section className="panel">
            <div className="panel-heading">
              <div><h2>Healthy habits</h2><p>Small votes for your identity.</p></div>
              <button onClick={() => onNavigate('habits')} type="button">View all</button>
            </div>
            <div className="habit-list">
              {habits.slice(0, 5).map((habit) => (
                <article className={`habit-row ${habit.done ? 'done' : ''}`} key={habit.id}>
                  <button
                    aria-label={`Complete ${habit.name}`}
                    disabled={habit.done}
                    onClick={() => onCompleteHabit(habit.id)}
                    type="button"
                  >
                    {habit.done ? <Check size={15} /> : <Plus size={15} />}
                  </button>
                  <div><strong>{habit.name}</strong><span>{habit.cue} · {habit.completedToday}/{habit.targetPerDay}</span></div>
                  <small>{habit.xp} XP</small>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div><h2>Action goals</h2><p>Measurable growth toward your targets.</p></div>
              <button onClick={() => onNavigate('goals')} type="button">Manage</button>
            </div>
            <div className="goal-list">
              {goals.slice(0, 4).map((goal) => (
                <article className="goal-row" key={goal.id}>
                  <div>
                    <strong>{goal.name}</strong>
                    <span>{goal.current}/{goal.target} {goal.unit} · {goal.cadence}</span>
                    <div className="track"><i style={{ width: `${goal.percent}%` }} /></div>
                  </div>
                  <button disabled={goal.current >= goal.target} onClick={() => onProgressGoal(goal.id)} type="button">
                    +1
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="insight-grid">
            <article className="insight-card gold">
              <div className="tip-controls">
                <span>Habit Lab</span>
                <div>
                  <button aria-label="Previous tip" onClick={() => setTipIndex((tipIndex + 3) % 4)} type="button"><ChevronLeft size={16} /></button>
                  <button aria-label="Next tip" onClick={() => setTipIndex((tipIndex + 1) % 4)} type="button"><ChevronRight size={16} /></button>
                </div>
              </div>
              <strong>{tips[tipIndex][0]}</strong>
              <p>{tips[tipIndex][1]}</p>
              <small>{tipIndex + 1}/4</small>
            </article>
            <article className="insight-card purple">
              <span>Next milestone</span>
              <strong>{milestone}</strong>
              <p>{profile.xp}/500 XP toward the next system milestone.</p>
              <div className="track"><i style={{ width: `${Math.min(100, (profile.xp / 500) * 100)}%` }} /></div>
            </article>
            <article className="insight-card brown">
              <span>System insight</span>
              <strong>Growth Curve</strong>
              <p>Your productivity rises when habits have a clear time cue.</p>
            </article>
          </section>
        </div>
      </section>
    </>
  )
}

function formatDashboardTime(time) {
  const [hour, minute] = time.split(':').map(Number)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2026, 0, 1, hour, minute))
}
