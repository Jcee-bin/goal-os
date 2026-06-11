import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/database.js'

test('imports legacy Goal OS and budget data exactly once', async () => {
  const db = createDatabase()
  const { app } = createApp({ db, now: () => new Date(2026, 5, 6, 10, 0, 0) })
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`
  const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'content-type': 'application/json' },
      body: options.body && JSON.stringify(options.body),
    })
    return { status: response.status, body: await response.json() }
  }

  try {
    const imported = await request('/import/legacy', {
      method: 'POST',
      body: {
        goal: {
          identity: 'I am a consistent builder.',
          arena: 'business',
          identityConfirmed: true,
          xp: 45,
          habits: [{ id: 'old-habit', name: 'Ship work', xp: 15, targetPerDay: 1, cue: 'morning' }],
          completions: { 'old-habit': ['2026-06-06'] },
          goals: [{ name: 'Publish', target: 4, current: 2, unit: 'times', cadence: 'weekly', weekKey: '2026-06-01' }],
          evidence: [{ text: 'Shipped work', xp: 15, date: '2026-06-06' }],
        },
        budget: {
          entries: [
            { type: 'income', account: 'cash', amount: 1000, note: 'Cash', date: '2026-06-05T10:00:00.000Z' },
            { type: 'expense', account: 'cash', status: 'pending', category: 'wants', amount: 250, note: 'Order', date: '2026-06-06T10:00:00.000Z' },
          ],
        },
      },
    })
    assert.equal(imported.status, 200)
    const dashboard = (await request('/dashboard')).body
    assert.equal(dashboard.profile.identity, 'I am a consistent builder.')
    assert.equal(dashboard.profile.xp, 45)
    assert.equal(dashboard.habits.length, 1)
    assert.equal(dashboard.habits[0].completedToday, 1)
    const budget = (await request('/budget/summary')).body
    assert.equal(budget.balances.cash, 100000)
    assert.equal(budget.pending, 25000)
    assert.equal((await request('/import/legacy', { method: 'POST', body: { goal: {} } })).status, 409)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
  }
})
