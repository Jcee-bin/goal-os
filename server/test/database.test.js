import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createDatabase } from '../src/database.js'

test('creates the complete local schema and seeded user', () => {
  const db = createDatabase()
  const tableNames = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all().map(({ name }) => name)

  assert.deepEqual(tableNames, [
    'evidence_entries',
    'goal_progress_events',
    'goals',
    'habit_completions',
    'habits',
    'profiles',
    'transactions',
    'users',
    'xp_events',
  ])
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM profiles').get().count, 1)
  db.close()
})

test('rebuilds the incompatible prototype schema', () => {
  const filename = join(mkdtempSync(join(tmpdir(), 'goal-os-')), 'prototype.sqlite')
  const db = createDatabase({ filename, seed: false })
  db.exec('DROP TABLE habits')
  db.exec('CREATE TABLE habits (id TEXT PRIMARY KEY, name TEXT NOT NULL)')
  db.close()

  const prototype = createDatabase({ filename })
  const columns = prototype.prepare('PRAGMA table_info(habits)').all().map(({ name }) => name)
  assert.ok(columns.includes('user_id'))
  assert.equal(prototype.prepare('SELECT COUNT(*) AS count FROM profiles').get().count, 1)
  prototype.close()
})
