import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/database.js'

function fakeGoogle() {
  const calls = []
  let failNext = false
  let missingNext = false
  let inboundEvents = []
  return {
    calls,
    fail() { failNext = true },
    missing() { missingNext = true },
    setInboundEvents(events) { inboundEvents = events },
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
    async listEvents() {
      calls.push(['listEvents'])
      return { items: inboundEvents }
    },
  }
}

async function withApi(run) {
  const db = createDatabase()
  const googleClient = fakeGoogle()
  const { app } = createApp({
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
  })
  const server = app.listen(0)
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

test('pollInbound returns early and does nothing when not connected', async () => {
  await withApi(async ({ request }) => {
    const result = await request('/integrations/google/sync', { method: 'POST' })
    assert.equal(result.status, 200)
    assert.equal(result.body.processed, 0)
    assert.equal(result.body.imported, 0)
  })
})

test('pollInbound applies update when Google event is newer than task', async () => {
  await withApi(async ({ request, googleClient }) => {
    await connect(request)
    const task = (await request('/tasks', { method: 'POST', body: timedTask })).body
    assert.equal(task.syncStatus, 'synced')

    googleClient.setInboundEvents([{
      id: task.calendarEventId,
      status: 'confirmed',
      summary: 'Updated by Google',
      description: 'new notes',
      start: { dateTime: '2026-06-06T20:00:00+08:00' },
      end: { dateTime: '2026-06-06T21:00:00+08:00' },
      updated: new Date(Date.now() + 10_000).toISOString(),
    }])
    const sync = await request('/integrations/google/sync', { method: 'POST' })
    assert.equal(sync.body.processed, 1)

    const updated = (await request('/tasks?date=2026-06-06')).body.timed[0]
    assert.equal(updated.title, 'Updated by Google')
    assert.equal(updated.startTime, '20:00')
  })
})

test('pollInbound skips update when task was modified more recently than Google event', async () => {
  await withApi(async ({ request, googleClient }) => {
    await connect(request)
    const task = (await request('/tasks', { method: 'POST', body: timedTask })).body

    googleClient.setInboundEvents([{
      id: task.calendarEventId,
      status: 'confirmed',
      summary: 'Stale Google title',
      description: '',
      start: { dateTime: '2026-06-06T19:00:00+08:00' },
      end: { dateTime: '2026-06-06T20:00:00+08:00' },
      updated: new Date(Date.now() - 10_000).toISOString(),
    }])
    await request('/integrations/google/sync', { method: 'POST' })

    const tasks = (await request('/tasks?date=2026-06-06')).body.timed
    assert.equal(tasks[0].title, 'Study for exam')
  })
})

test('pollInbound unlinks a Goal OS task when its Google event is cancelled', async () => {
  await withApi(async ({ request, googleClient }) => {
    await connect(request)
    const task = (await request('/tasks', { method: 'POST', body: timedTask })).body

    googleClient.setInboundEvents([{
      id: task.calendarEventId,
      status: 'cancelled',
      start: { dateTime: '2026-06-06T19:00:00+08:00' },
      end: { dateTime: '2026-06-06T20:00:00+08:00' },
      updated: new Date(Date.now() + 10_000).toISOString(),
    }])
    const sync = await request('/integrations/google/sync', { method: 'POST' })
    assert.equal(sync.body.processed, 1)

    const tasks = (await request('/tasks?date=2026-06-06')).body
    const found = [...tasks.timed, ...tasks.anytime, ...tasks.inbox].find((t) => t.id === task.id)
    assert.equal(found.calendarEventId, null)
    assert.equal(found.calendarEnabled, false)
  })
})

test('pollInbound imports arbitrary Google Calendar events as tasks', async () => {
  await withApi(async ({ request, googleClient }) => {
    await connect(request)

    googleClient.setInboundEvents([{
      id: 'external-event-1',
      status: 'confirmed',
      summary: 'Doctor appointment',
      description: 'Bring ID',
      start: { dateTime: '2026-06-06T10:00:00+08:00' },
      end: { dateTime: '2026-06-06T11:00:00+08:00' },
      updated: new Date(Date.now() + 5_000).toISOString(),
    }])
    const sync = await request('/integrations/google/sync', { method: 'POST' })
    assert.equal(sync.body.imported, 1)

    const tasks = (await request('/tasks?date=2026-06-06')).body.timed
    const imported = tasks.find((t) => t.calendarEventId === 'external-event-1')
    assert.ok(imported)
    assert.equal(imported.title, 'Doctor appointment')
    assert.equal(imported.startTime, '10:00')
    assert.equal(imported.calendarEnabled, true)
    assert.equal(imported.syncStatus, 'synced')
  })
})

test('pollInbound skips all-day events (no start.dateTime)', async () => {
  await withApi(async ({ request, googleClient }) => {
    await connect(request)

    googleClient.setInboundEvents([{
      id: 'all-day-event',
      status: 'confirmed',
      summary: 'Birthday',
      start: { date: '2026-06-06' },
      end: { date: '2026-06-07' },
      updated: new Date(Date.now() + 5_000).toISOString(),
    }])
    const sync = await request('/integrations/google/sync', { method: 'POST' })
    assert.equal(sync.body.imported, 0)
    assert.equal(sync.body.processed, 0)
  })
})

test('pollInbound skips cancelled events with no matching task', async () => {
  await withApi(async ({ request, googleClient }) => {
    await connect(request)

    googleClient.setInboundEvents([{
      id: 'ghost-event',
      status: 'cancelled',
      start: { dateTime: '2026-06-06T10:00:00+08:00' },
      end: { dateTime: '2026-06-06T11:00:00+08:00' },
      updated: new Date().toISOString(),
    }])
    const sync = await request('/integrations/google/sync', { method: 'POST' })
    assert.equal(sync.body.imported, 0)
    assert.equal(sync.body.processed, 0)
  })
})

test('pollInbound updates lastPolledAt even when no events match', async () => {
  await withApi(async ({ request }) => {
    await connect(request)
    const before = (await request('/integrations/google/status')).body
    assert.equal(before.lastPolledAt, null)

    await request('/integrations/google/sync', { method: 'POST' })
    const after = (await request('/integrations/google/status')).body
    assert.ok(after.lastPolledAt)
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
