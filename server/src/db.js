import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dataDirectory = resolve(here, '..', 'data')
mkdirSync(dataDirectory, { recursive: true })

export const db = new DatabaseSync(resolve(dataDirectory, 'goal-os.sqlite'))

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    identity TEXT NOT NULL,
    arena TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    xp INTEGER NOT NULL,
    target_per_day INTEGER NOT NULL DEFAULT 1,
    cue TEXT NOT NULL DEFAULT 'anytime',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS habit_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id TEXT NOT NULL,
    completed_on TEXT NOT NULL,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target INTEGER NOT NULL,
    current INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'times',
    cadence TEXT NOT NULL DEFAULT 'ongoing',
    created_at TEXT NOT NULL
  );
`)

const profileCount = db.prepare('SELECT COUNT(*) AS count FROM profile').get().count

if (profileCount === 0) {
  db.prepare('INSERT INTO profile (id, identity, arena, xp) VALUES (1, ?, ?, 0)').run(
    'I am becoming someone who keeps promises to myself.',
    'health',
  )

  const insertHabit = db.prepare(`
    INSERT INTO habits (id, name, xp, target_per_day, cue, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const createdAt = new Date().toISOString()
  insertHabit.run(crypto.randomUUID(), 'Move my body', 10, 1, 'morning', createdAt)
  insertHabit.run(crypto.randomUUID(), 'Learn for 25 minutes', 15, 1, 'afternoon', createdAt)
  insertHabit.run(crypto.randomUUID(), 'Sleep reset routine', 10, 1, 'night', createdAt)

  db.prepare(`
    INSERT INTO goals (id, name, target, current, unit, cadence, created_at)
    VALUES (?, ?, 5, 0, 'times', 'ongoing', ?)
  `).run(crypto.randomUUID(), 'Complete 5 identity votes', createdAt)
}

export function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
