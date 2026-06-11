import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { LOCAL_USER_ID } from './domain.js'

const schema = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    identity TEXT NOT NULL,
    arena TEXT NOT NULL DEFAULT '',
    identity_confirmed INTEGER NOT NULL DEFAULT 0,
    legacy_imported INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    xp INTEGER NOT NULL,
    target_per_day INTEGER NOT NULL DEFAULT 1,
    cue TEXT NOT NULL DEFAULT 'anytime',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS habits_user_idx ON habits(user_id, active, created_at);

  CREATE TABLE IF NOT EXISTS habit_completions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    habit_id TEXT NOT NULL,
    completed_on TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS completions_habit_date_idx
    ON habit_completions(user_id, habit_id, completed_on);

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target INTEGER NOT NULL,
    current INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'times',
    cadence TEXT NOT NULL DEFAULT 'ongoing',
    week_key TEXT NOT NULL DEFAULT '',
    completion_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS goals_user_idx ON goals(user_id, created_at);

  CREATE TABLE IF NOT EXISTS goal_progress_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    goal_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    event_on TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS evidence_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    description TEXT NOT NULL,
    xp_delta INTEGER NOT NULL DEFAULT 0,
    event_on TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS evidence_user_date_idx
    ON evidence_entries(user_id, event_on, created_at);

  CREATE TABLE IF NOT EXISTS xp_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    amount INTEGER NOT NULL,
    event_on TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS xp_user_date_idx ON xp_events(user_id, event_on, created_at);

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    account TEXT NOT NULL,
    destination_account TEXT,
    status TEXT NOT NULL DEFAULT 'paid',
    category TEXT NOT NULL,
    amount_centavos INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    transaction_on TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS transactions_user_date_idx
    ON transactions(user_id, transaction_on, created_at);

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    area TEXT NOT NULL DEFAULT 'personal',
    priority TEXT NOT NULL DEFAULT 'normal',
    scheduled_on TEXT,
    start_time TEXT,
    end_time TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    calendar_enabled INTEGER NOT NULL DEFAULT 0,
    calendar_event_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'local',
    sync_error TEXT,
    completed_on TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS tasks_user_schedule_idx
    ON tasks(user_id, status, scheduled_on, start_time, created_at);

  CREATE TABLE IF NOT EXISTS google_integrations (
    user_id TEXT PRIMARY KEY,
    refresh_token_encrypted TEXT,
    calendar_id TEXT,
    connected_at TEXT,
    last_polled_at TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS google_oauth_states (
    state TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS calendar_outbox (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    last_error TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sleep_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    slept_at TEXT NOT NULL,
    woke_at TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    quality INTEGER NOT NULL DEFAULT 3,
    notes TEXT NOT NULL DEFAULT '',
    recorded_on TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS sleep_logs_user_date_idx
    ON sleep_logs(user_id, recorded_on, created_at);
`

export function createDatabase({ filename = ':memory:', seed = true } = {}) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
  const db = new DatabaseSync(filename)
  rebuildPrototypeSchemaIfNeeded(db)
  db.exec(schema)
  migrateCurrentSchema(db)
  if (seed) seedLocalUser(db)
  return db
}

function migrateCurrentSchema(db) {
  const taskColumns = db.prepare('PRAGMA table_info(tasks)').all().map(({ name }) => name)
  if (!taskColumns.includes('completed_on')) {
    db.exec('ALTER TABLE tasks ADD COLUMN completed_on TEXT')
  }
  const googleColumns = db.prepare('PRAGMA table_info(google_integrations)').all().map(({ name }) => name)
  if (!googleColumns.includes('last_polled_at')) {
    db.exec('ALTER TABLE google_integrations ADD COLUMN last_polled_at TEXT')
  }
  const sleepColumns = db.prepare('PRAGMA table_info(sleep_logs)').all().map(({ name }) => name)
  if (!sleepColumns.includes('type')) {
    db.exec("ALTER TABLE sleep_logs ADD COLUMN type TEXT NOT NULL DEFAULT 'night'")
  }
}

function rebuildPrototypeSchemaIfNeeded(db) {
  const habitsTable = db.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'habits'
  `).get()
  if (!habitsTable) return

  const columns = db.prepare('PRAGMA table_info(habits)').all().map(({ name }) => name)
  if (columns.includes('user_id')) return

  db.exec(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS habit_completions;
    DROP TABLE IF EXISTS habits;
    DROP TABLE IF EXISTS goals;
    DROP TABLE IF EXISTS profile;
    PRAGMA foreign_keys = ON;
  `)
}

function seedLocalUser(db) {
  const now = new Date().toISOString()
  db.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').run(LOCAL_USER_ID, now)
  db.prepare(`
    INSERT OR IGNORE INTO profiles
      (user_id, identity, arena, identity_confirmed, legacy_imported)
    VALUES (?, ?, ?, 0, 0)
  `).run(
    LOCAL_USER_ID,
    'I am becoming someone who keeps promises to myself.',
    'Personal growth',
  )

  const habitCount = db.prepare('SELECT COUNT(*) AS count FROM habits WHERE user_id = ?')
    .get(LOCAL_USER_ID).count
  if (habitCount === 0) {
    const insertHabit = db.prepare(`
      INSERT INTO habits
        (id, user_id, name, xp, target_per_day, cue, active, created_at)
      VALUES (?, ?, ?, ?, 1, ?, 1, ?)
    `)
    insertHabit.run(
      '10000000-0000-4000-8000-000000000001',
      LOCAL_USER_ID,
      'Move my body',
      10,
      'morning',
      now,
    )
    insertHabit.run(
      '10000000-0000-4000-8000-000000000002',
      LOCAL_USER_ID,
      'Learn for 25 minutes',
      15,
      'afternoon',
      now,
    )
    insertHabit.run(
      '10000000-0000-4000-8000-000000000003',
      LOCAL_USER_ID,
      'Sleep reset routine',
      10,
      'night',
      now,
    )
  }

  const goalCount = db.prepare('SELECT COUNT(*) AS count FROM goals WHERE user_id = ?')
    .get(LOCAL_USER_ID).count
  if (goalCount === 0) {
    db.prepare(`
      INSERT INTO goals
        (id, user_id, name, target, current, unit, cadence, week_key,
         completion_awarded, created_at)
      VALUES (?, ?, ?, 5, 0, 'times', 'ongoing', '', 0, ?)
    `).run(
      '20000000-0000-4000-8000-000000000001',
      LOCAL_USER_ID,
      'Complete 5 identity votes',
      now,
    )
  }
}
