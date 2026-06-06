import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/database.js'

async function withApi(run) {
  const db = createDatabase()
  const now = new Date('2026-06-06T08:00:00+08:00')
  const server = createApp({ db, now: () => new Date(now) }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...options.headers },
      body: options.body && JSON.stringify(options.body),
    })
    return { status: response.status, body: await response.json() }
  }

  try {
    await run({ request })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
  }
}

test('groups inbox, overdue, anytime, timed, and completed tasks for a day', async () => {
  await withApi(async ({ request }) => {
    const tasks = [
      { title: 'Inbox thought', area: 'personal', priority: 'normal' },
      { title: 'Old assignment', area: 'school', priority: 'high', scheduledOn: '2026-06-05' },
      { title: 'Submit project', area: 'school', priority: 'high', scheduledOn: '2026-06-06' },
      {
        title: 'Gym',
        area: 'health',
        priority: 'normal',
        scheduledOn: '2026-06-06',
        startTime: '18:00',
        endTime: '19:30',
      },
      {
        title: 'Class',
        area: 'school',
        priority: 'normal',
        scheduledOn: '2026-06-06',
        startTime: '07:40',
        endTime: '17:00',
      },
    ]
    const created = []
    for (const body of tasks) {
      created.push((await request('/tasks', { method: 'POST', body })).body)
    }
    await request(`/tasks/${created[2].id}/complete`, { method: 'POST' })

    const result = (await request('/tasks?date=2026-06-06')).body
    assert.deepEqual(result.inbox.map(({ title }) => title), ['Inbox thought'])
    assert.deepEqual(result.overdue.map(({ title }) => title), ['Old assignment'])
    assert.deepEqual(result.anytime, [])
    assert.deepEqual(result.timed.map(({ title }) => title), ['Class', 'Gym'])
    assert.deepEqual(result.completed.map(({ title }) => title), ['Submit project'])
  })
})

test('validates task fields and reports overlapping time blocks', async () => {
  await withApi(async ({ request }) => {
    assert.equal((await request('/tasks', {
      method: 'POST',
      body: { title: '', area: 'school', priority: 'normal' },
    })).status, 400)
    assert.equal((await request('/tasks', {
      method: 'POST',
      body: {
        title: 'Broken time',
        area: 'school',
        priority: 'normal',
        scheduledOn: '2026-06-06',
        startTime: '10:00',
        endTime: '09:00',
      },
    })).status, 400)

    await request('/tasks', {
      method: 'POST',
      body: {
        title: 'Study',
        area: 'school',
        priority: 'high',
        scheduledOn: '2026-06-06',
        startTime: '10:00',
        endTime: '11:00',
      },
    })
    const overlapping = await request('/tasks', {
      method: 'POST',
      body: {
        title: 'Call',
        area: 'business',
        priority: 'normal',
        scheduledOn: '2026-06-06',
        startTime: '10:30',
        endTime: '11:30',
      },
    })
    assert.equal(overlapping.status, 201)
    assert.equal(overlapping.body.hasOverlap, true)
  })
})

test('edits, completes, reopens, and deletes tasks without awarding XP', async () => {
  await withApi(async ({ request }) => {
    const created = (await request('/tasks', {
      method: 'POST',
      body: { title: 'Draft', area: 'business', priority: 'low' },
    })).body
    const before = (await request('/dashboard')).body.profile.xp

    const updated = await request(`/tasks/${created.id}`, {
      method: 'PATCH',
      body: {
        title: 'Publish draft',
        notes: 'Client version',
        area: 'business',
        priority: 'high',
        scheduledOn: '2026-06-06',
        startTime: '14:00',
        endTime: '15:00',
      },
    })
    assert.equal(updated.body.title, 'Publish draft')
    assert.equal((await request(`/tasks/${created.id}/complete`, { method: 'POST' })).body.status, 'completed')
    assert.equal((await request(`/tasks/${created.id}/reopen`, { method: 'POST' })).body.status, 'open')
    assert.equal((await request('/dashboard')).body.profile.xp, before)
    assert.deepEqual(
      (await request(`/tasks/${created.id}`, { method: 'DELETE' })).body,
      { deleted: true },
    )
  })
})

test('keeps an inbox task in the selected day completed section after completion', async () => {
  await withApi(async ({ request }) => {
    const inbox = (await request('/tasks', {
      method: 'POST',
      body: { title: 'Quick call', area: 'personal', priority: 'normal' },
    })).body
    await request(`/tasks/${inbox.id}/complete`, { method: 'POST' })

    const result = (await request('/tasks?date=2026-06-06')).body
    assert.deepEqual(result.completed.map(({ title }) => title), ['Quick call'])
  })
})
