import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/database.js'

function fakeGoogle() {
  const calls = []
  let failNext = false
  let missingNext = false
  return {
    calls,
    fail() { failNext = true },
    missing() { missingNext = true },
    authorizationUrl({ state }) {
      return `https://accounts.example/authorize?state=${state}`
    },
    async exchangeCode(code) {
      calls.push(['exchange', code])
      return { refreshToken: 'secret-refresh-token', accessToken: 'access-token' }
    },
    async refreshAccessToken(refreshToken) {
      calls.push(['refresh', refreshToken])
      return 'access-token'
    },
    async ensureCalendar({ calendarId }) {
      calls.push(['calendar', calendarId])
      return calendarId || 'goal-os-calendar'
    },
    async upsertEvent({ eventId, task }) {
      calls.push(['upsert', eventId, task.title, task.status])
      if (failNext) {
        failNext = false
        throw Object.assign(new Error('Google unavailable'), { status: 503 })
      }
      if (missingNext && eventId) {
        missingNext = false
        throw Object.assign(new Error('Event missing'), { status: 404 })
      }
      return eventId || `event-${task.id}`
    },
    async deleteEvent({ eventId }) {
      calls.push(['delete', eventId])
    },
  }
}

async function withApi(run) {
  const db = createDatabase()
  const googleClient = fakeGoogle()
  const server = createApp({
    db,
    now: () => new Date('2026-06-06T08:00:00+08:00'),
    googleClient,
    googleConfig: {
      clientId: 'client',
      clientSecret: 'secret',
      redirectUri: 'http://localhost/api/integrations/google/callback',
      tokenEncryptionKey: 'test-encryption-key',
      clientOrigin: 'http://localhost:5173',
      timeZone: 'Asia/Manila',
    },
  }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...options.headers },
      body: options.body && JSON.stringify(options.body),
    })
    const text = await response.text()
    const isJson = response.headers.get('content-type')?.includes('application/json')
    return {
      status: response.status,
      headers: response.headers,
      body: text && isJson ? JSON.parse(text) : null,
    }
  }

  try {
    await run({ request, db, googleClient })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
  }
}

async function connect(request) {
  const connection = await request('/integrations/google/connect')
  const state = new URL(connection.body.url).searchParams.get('state')
  await request(`/integrations/google/callback?code=approved&state=${state}`, {
    redirect: 'manual',
  })
}

const timedTask = {
  title: 'Study for exam',
  notes: 'Chapter 4',
  area: 'school',
  priority: 'high',
  scheduledOn: '2026-06-06',
  startTime: '19:00',
  endTime: '20:00',
  calendarEnabled: true,
}

test('connects Google, encrypts the refresh token, and publishes pending tasks', async () => {
  await withApi(async ({ request, db, googleClient }) => {
    const pending = await request('/tasks', { method: 'POST', body: timedTask })
    assert.equal(pending.body.syncStatus, 'pending')

    await connect(request)
    const status = await request('/integrations/google/status')
    assert.equal(status.body.connected, true)
    assert.equal(status.body.calendarId, 'goal-os-calendar')
    const stored = db.prepare('SELECT refresh_token_encrypted AS token FROM google_integrations').get()
    assert.ok(stored.token)
    assert.equal(stored.token.includes('secret-refresh-token'), false)

    const tasks = await request('/tasks?date=2026-06-06')
    assert.equal(tasks.body.timed[0].syncStatus, 'synced')
    assert.ok(tasks.body.timed[0].calendarEventId)
    assert.ok(googleClient.calls.some(([name]) => name === 'upsert'))
  })
})

test('updates completion titles, reopens, recreates missing events, and deletes remotely', async () => {
  await withApi(async ({ request, googleClient }) => {
    await connect(request)
    const task = (await request('/tasks', { method: 'POST', body: timedTask })).body
    assert.equal(task.syncStatus, 'synced')

    await request(`/tasks/${task.id}/complete`, { method: 'POST' })
    assert.ok(googleClient.calls.some((call) => call[0] === 'upsert' && call[2] === 'Done: Study for exam'))
    await request(`/tasks/${task.id}/reopen`, { method: 'POST' })
    assert.ok(googleClient.calls.some((call) => call[0] === 'upsert' && call[2] === 'Study for exam'))

    googleClient.missing()
    await request(`/tasks/${task.id}`, {
      method: 'PATCH',
      body: { ...timedTask, notes: 'Chapter 5' },
    })
    const creates = googleClient.calls.filter((call) => call[0] === 'upsert' && call[1] === null)
    assert.equal(creates.length >= 2, true)

    await request(`/tasks/${task.id}`, { method: 'DELETE' })
    assert.ok(googleClient.calls.some((call) => call[0] === 'delete'))
  })
})

test('keeps local changes on sync failure and retries successfully', async () => {
  await withApi(async ({ request, googleClient }) => {
    await connect(request)
    googleClient.fail()
    const task = await request('/tasks', { method: 'POST', body: timedTask })
    assert.equal(task.status, 201)
    assert.equal(task.body.syncStatus, 'failed')
    assert.match(task.body.syncError, /Google unavailable/)

    const retried = await request(`/tasks/${task.body.id}/retry-sync`, { method: 'POST' })
    assert.equal(retried.body.syncStatus, 'synced')
  })
})

test('disconnects without deleting the Goal OS calendar', async () => {
  await withApi(async ({ request, googleClient }) => {
    await connect(request)
    const disconnected = await request('/integrations/google/disconnect', { method: 'POST' })
    assert.equal(disconnected.body.connected, false)
    assert.equal(disconnected.body.calendarId, 'goal-os-calendar')
    assert.equal(googleClient.calls.some(([name]) => name === 'delete-calendar'), false)
  })
})

test('queues removal of a linked event when calendar publishing is disabled offline', async () => {
  await withApi(async ({ request, db }) => {
    await connect(request)
    const task = (await request('/tasks', { method: 'POST', body: timedTask })).body
    await request('/integrations/google/disconnect', { method: 'POST' })

    const updated = await request(`/tasks/${task.id}`, {
      method: 'PATCH',
      body: { ...timedTask, calendarEnabled: false },
    })
    assert.equal(updated.body.calendarEventId, null)
    assert.equal(updated.body.syncStatus, 'local')
    assert.equal(
      db.prepare('SELECT COUNT(*) AS count FROM calendar_outbox').get().count,
      1,
    )

    await connect(request)
    assert.equal(
      db.prepare('SELECT COUNT(*) AS count FROM calendar_outbox').get().count,
      0,
    )
  })
})
