import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/database.js'

async function withApi(run, date = new Date(2026, 5, 6, 9, 0, 0)) {
  const db = createDatabase()
  const { app } = createApp({ db, now: () => new Date(date) })
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...options.headers },
      body: options.body && JSON.stringify(options.body),
    })
    const body = await response.json()
    return { status: response.status, body }
  }

  try {
    await run({ request, db })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
  }
}

test('updates identity and records matching XP evidence', async () => {
  await withApi(async ({ request }) => {
    const result = await request('/profile', {
      method: 'PATCH',
      body: {
        identity: 'I am someone who finishes what I start.',
        arena: 'School and health',
        identityConfirmed: true,
      },
    })
    assert.equal(result.status, 200)
    assert.equal(result.body.identityConfirmed, true)

    const dashboard = await request('/dashboard')
    assert.equal(dashboard.body.profile.xp, 5)
    assert.equal(dashboard.body.evidence[0].description, 'Identity updated')
  })
})

test('habit completion is bounded and awards XP atomically', async () => {
  await withApi(async ({ request }) => {
    const created = await request('/habits', {
      method: 'POST',
      body: { name: 'NSDR', xp: 15, targetPerDay: 2, cue: 'afternoon' },
    })
    assert.equal(created.status, 201)

    assert.equal((await request(`/habits/${created.body.id}/completions`, { method: 'POST' })).status, 201)
    assert.equal((await request(`/habits/${created.body.id}/completions`, { method: 'POST' })).status, 201)
    assert.equal((await request(`/habits/${created.body.id}/completions`, { method: 'POST' })).status, 409)

    const dashboard = await request('/dashboard')
    const habit = dashboard.body.habits.find(({ id }) => id === created.body.id)
    assert.equal(habit.completedToday, 2)
    assert.equal(habit.done, true)
    assert.equal(dashboard.body.profile.xp, 30)
    assert.equal(dashboard.body.evidence.length, 2)
  })
})

test('goal completion bonus is awarded once', async () => {
  await withApi(async ({ request }) => {
    const created = await request('/goals', {
      method: 'POST',
      body: { name: 'Workout four days', target: 2, unit: 'sessions', cadence: 'weekly' },
    })
    await request(`/goals/${created.body.id}/progress`, { method: 'POST', body: { amount: 1 } })
    const completed = await request(`/goals/${created.body.id}/progress`, {
      method: 'POST',
      body: { amount: 1 },
    })
    assert.equal(completed.body.current, 2)
    assert.equal(
      (await request(`/goals/${created.body.id}/progress`, { method: 'POST', body: { amount: 1 } })).status,
      409,
    )
    assert.equal((await request('/dashboard')).body.profile.xp, 90)
  })
})

test('weekly goals roll over to a new Monday-based week', async () => {
  let current = new Date(2026, 5, 6, 9, 0, 0)
  const db = createDatabase()
  const { app: serviceApp } = createApp({ db, now: () => new Date(current) })
  const server = serviceApp.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`
  const send = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'content-type': 'application/json' },
      body: options.body && JSON.stringify(options.body),
    })
    return response.json()
  }

  try {
    const goal = await send('/goals', {
      method: 'POST',
      body: { name: 'Train', target: 4, unit: 'sessions', cadence: 'weekly' },
    })
    await send(`/goals/${goal.id}/progress`, { method: 'POST', body: { amount: 2 } })
    current = new Date(2026, 5, 8, 9, 0, 0)
    const goals = await send('/goals')
    assert.equal(goals.find(({ id }) => id === goal.id).current, 0)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
  }
})

test('reset logs preserves configured habits and goals', async () => {
  await withApi(async ({ request }) => {
    const habit = await request('/habits', {
      method: 'POST',
      body: { name: 'Read', xp: 10, targetPerDay: 1, cue: 'night' },
    })
    await request(`/habits/${habit.body.id}/completions`, { method: 'POST' })
    const goal = await request('/goals', {
      method: 'POST',
      body: { name: 'Study', target: 3, unit: 'blocks', cadence: 'ongoing' },
    })
    await request(`/goals/${goal.body.id}/progress`, { method: 'POST', body: { amount: 1 } })

    const reset = await request('/reset-logs', { method: 'POST' })
    assert.equal(reset.body.profile.xp, 0)
    assert.equal(reset.body.evidence.length, 0)
    assert.ok(reset.body.habits.some(({ id }) => id === habit.body.id))
    assert.equal(reset.body.goals.find(({ id }) => id === goal.body.id).current, 0)
  })
})
