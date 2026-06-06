import cors from 'cors'
import express from 'express'
import { db, getTodayKey } from './db.js'

const app = express()
const port = Number(process.env.PORT || 8787)

app.use(cors())
app.use(express.json())

function getState() {
  const today = getTodayKey()
  const profile = db.prepare('SELECT identity, arena, xp FROM profile WHERE id = 1').get()
  const habits = db.prepare(`
    SELECT
      h.id,
      h.name,
      h.xp,
      h.target_per_day AS targetPerDay,
      h.cue,
      COUNT(c.id) AS completedToday
    FROM habits h
    LEFT JOIN habit_completions c
      ON c.habit_id = h.id AND c.completed_on = ?
    GROUP BY h.id
    ORDER BY h.created_at ASC
  `).all(today)
  const goals = db.prepare(`
    SELECT id, name, target, current, unit, cadence
    FROM goals
    ORDER BY created_at ASC
  `).all()

  return {
    profile,
    habits: habits.map((habit) => ({
      ...habit,
      done: habit.completedToday >= habit.targetPerDay,
    })),
    goals,
    today,
  }
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/state', (_request, response) => {
  response.json(getState())
})

app.post('/api/habits/:habitId/complete', (request, response) => {
  const habit = db.prepare('SELECT id, xp, target_per_day AS targetPerDay FROM habits WHERE id = ?').get(
    request.params.habitId,
  )
  if (!habit) return response.status(404).json({ error: 'Habit not found' })

  const today = getTodayKey()
  const count = db.prepare(`
    SELECT COUNT(*) AS count
    FROM habit_completions
    WHERE habit_id = ? AND completed_on = ?
  `).get(habit.id, today).count

  if (count < habit.targetPerDay) {
    db.prepare('INSERT INTO habit_completions (habit_id, completed_on) VALUES (?, ?)').run(habit.id, today)
    db.prepare('UPDATE profile SET xp = xp + ? WHERE id = 1').run(habit.xp)
  }

  return response.json(getState())
})

app.listen(port, () => {
  console.log(`Goal OS API listening on http://localhost:${port}`)
})
