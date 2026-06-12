import { createGoogleRepository } from '../repositories/googleRepository.js'
import { createTaskRepository } from '../repositories/taskRepository.js'
import { decryptToken, encryptToken } from './tokenCipher.js'

export function createGoogleIntegrationService({
  db,
  userId,
  googleClient,
  config,
  now = () => new Date(),
}) {
  const repository = createGoogleRepository(db)
  const tasks = createTaskRepository(db)
  const configured = Boolean(
    config.clientId && config.clientSecret && config.redirectUri && config.tokenEncryptionKey,
  )

  async function status() {
    const integration = await repository.getIntegration(userId)
    return {
      configured,
      connected: Boolean(integration?.refreshTokenEncrypted),
      calendarId: integration?.calendarId || null,
      connectedAt: integration?.connectedAt || null,
      lastPolledAt: integration?.lastPolledAt || null,
    }
  }

  function requireConfigured() {
    if (!configured) {
      throw Object.assign(new Error('Google Calendar credentials are not configured'), { status: 503 })
    }
  }

  async function access() {
    const integration = await repository.getIntegration(userId)
    if (!integration?.refreshTokenEncrypted) return null
    const refreshToken = decryptToken(
      integration.refreshTokenEncrypted,
      config.tokenEncryptionKey,
    )
    const accessToken = await googleClient.refreshAccessToken(refreshToken)
    return { accessToken, integration }
  }

  async function syncTask(task) {
    const eligible = task.calendarEnabled && task.scheduledOn && task.startTime
    if (!eligible && !task.calendarEventId) {
      return tasks.setCalendarState(userId, task.id, {
        eventId: null,
        syncStatus: 'local',
        syncError: null,
      })
    }
    const auth = await access()
    if (!eligible && task.calendarEventId) {
      if (auth) {
        try {
          await googleClient.deleteEvent({
            accessToken: auth.accessToken,
            calendarId: auth.integration.calendarId,
            eventId: task.calendarEventId,
          })
        } catch (error) {
          await repository.addDeleteOutbox(
            userId,
            task.calendarEventId,
            now().toISOString(),
            error.message,
          )
        }
      } else {
        await repository.addDeleteOutbox(
          userId,
          task.calendarEventId,
          now().toISOString(),
          'Google Calendar is disconnected',
        )
      }
      return tasks.setCalendarState(userId, task.id, {
        eventId: null,
        syncStatus: 'local',
        syncError: null,
      })
    }
    if (!auth) {
      return tasks.setCalendarState(userId, task.id, {
        eventId: task.calendarEventId,
        syncStatus: 'pending',
        syncError: null,
      })
    }

    try {
      await flushOutbox(auth)
      let eventId
      try {
        eventId = await googleClient.upsertEvent({
          accessToken: auth.accessToken,
          calendarId: auth.integration.calendarId,
          eventId: task.calendarEventId,
          task: calendarTask(task),
          timeZone: config.timeZone,
        })
      } catch (error) {
        if (error.status !== 404 || !task.calendarEventId) throw error
        eventId = await googleClient.upsertEvent({
          accessToken: auth.accessToken,
          calendarId: auth.integration.calendarId,
          eventId: null,
          task: calendarTask(task),
          timeZone: config.timeZone,
        })
      }
      return tasks.setCalendarState(userId, task.id, {
        eventId,
        syncStatus: 'synced',
        syncError: null,
      })
    } catch (error) {
      return tasks.setCalendarState(userId, task.id, {
        eventId: task.calendarEventId,
        syncStatus: 'failed',
        syncError: error.message,
      })
    }
  }

  async function flushOutbox(auth) {
    for (const item of await repository.listOutbox(userId)) {
      try {
        await googleClient.deleteEvent({
          accessToken: auth.accessToken,
          calendarId: auth.integration.calendarId,
          eventId: item.eventId,
        })
        await repository.deleteOutbox(item.id)
      } catch {
        // Keep the deletion queued for a future successful request.
      }
    }
  }

  async function fetchAllUpdatedEvents(auth, updatedMin) {
    const items = []
    let pageToken
    let pages = 0
    do {
      const page = await googleClient.listEvents({
        accessToken: auth.accessToken,
        calendarId: auth.integration.calendarId,
        updatedMin,
        pageToken,
      })
      items.push(...(page?.items || []))
      pageToken = page?.nextPageToken
      pages++
    } while (pageToken && pages < 20)
    return items
  }

  async function pollInbound() {
    const auth = await access()
    if (!auth) return { processed: 0, imported: 0 }
    const integration = await repository.getIntegration(userId)
    const updatedMin = integration.lastPolledAt || null
    const items = await fetchAllUpdatedEvents(auth, updatedMin)
    let processed = 0
    let imported = 0
    for (const event of items) {
      if (!event.start?.dateTime) continue
      const task = await tasks.getByCalendarEventId(userId, event.id)
      if (task) {
        if (event.status === 'cancelled') {
          await tasks.unlinkCalendar(userId, task.id, now().toISOString())
          processed++
        } else if (task.status !== 'completed') {
          const googleMs = new Date(event.updated).getTime()
          const taskMs = new Date(task.updatedAt).getTime()
          if (googleMs > taskMs + 2000) {
            try {
              const { scheduledOn, time: startTime } = parseGoogleDateTime(event.start.dateTime)
              const { time: endTime } = parseGoogleDateTime(event.end.dateTime)
              await tasks.applyInboundSync(userId, task.id, {
                title: String(event.summary || '').slice(0, 160),
                notes: String(event.description || '').slice(0, 1000),
                scheduledOn,
                startTime,
                endTime,
                updatedAt: event.updated,
              })
              processed++
            } catch {
              // skip events with unparseable datetimes
            }
          }
        }
      } else {
        if (event.status === 'cancelled') continue
        try {
          const { scheduledOn, time: startTime } = parseGoogleDateTime(event.start.dateTime)
          const { time: endTime } = parseGoogleDateTime(event.end.dateTime)
          const timestamp = now().toISOString()
          await tasks.insert(userId, {
            id: crypto.randomUUID(),
            title: String(event.summary || 'Untitled').slice(0, 160),
            notes: String(event.description || '').slice(0, 1000),
            area: 'personal',
            priority: 'normal',
            scheduledOn,
            startTime,
            endTime,
            calendarEnabled: true,
            calendarEventId: event.id,
            syncStatus: 'synced',
            createdAt: timestamp,
            updatedAt: event.updated || timestamp,
          })
          imported++
        } catch {
          // skip events with unparseable datetimes
        }
      }
    }
    await repository.saveLastPolled(userId, now().toISOString())
    return { processed, imported }
  }

  let syncing = false
  async function syncNow() {
    if (syncing) return { processed: 0, imported: 0 }
    syncing = true
    try {
      const auth = await access()
      if (auth) await flushOutbox(auth)
      for (const task of await tasks.listPendingCalendar(userId)) await syncTask(task)
      return pollInbound()
    } finally {
      syncing = false
    }
  }

  return {
    status,

    async connect() {
      requireConfigured()
      const state = crypto.randomUUID()
      const expiresAt = new Date(now().getTime() + 10 * 60 * 1000).toISOString()
      await repository.saveState(userId, state, expiresAt)
      return { url: googleClient.authorizationUrl({ state }) }
    },

    async callback({ code, state }) {
      requireConfigured()
      if (!code || !state || !(await repository.consumeState(userId, state, now().toISOString()))) {
        throw Object.assign(new Error('Invalid or expired Google authorization state'), { status: 400 })
      }
      const tokens = await googleClient.exchangeCode(code)
      if (!tokens.refreshToken) {
        throw Object.assign(new Error('Google did not return a refresh token'), { status: 400 })
      }
      const existing = await repository.getIntegration(userId)
      const calendarId = await googleClient.ensureCalendar({
        accessToken: tokens.accessToken,
        calendarId: existing?.calendarId,
      })
      const timestamp = now().toISOString()
      const savedIntegration = await repository.saveIntegration(userId, {
        refreshTokenEncrypted: encryptToken(tokens.refreshToken, config.tokenEncryptionKey),
        calendarId,
        connectedAt: timestamp,
        updatedAt: timestamp,
      })
      await flushOutbox({ accessToken: tokens.accessToken, integration: savedIntegration })
      for (const task of await tasks.listPendingCalendar(userId)) await syncTask(task)
      return status()
    },

    async disconnect() {
      await repository.disconnect(userId, now().toISOString())
      return status()
    },

    syncTask,
    pollInbound,
    syncNow,

    async deleteTask(task) {
      if (!task.calendarEventId) return
      const auth = await access()
      if (!auth) {
        await repository.addDeleteOutbox(
          userId,
          task.calendarEventId,
          now().toISOString(),
          'Google Calendar is disconnected',
        )
        return
      }
      try {
        await googleClient.deleteEvent({
          accessToken: auth.accessToken,
          calendarId: auth.integration.calendarId,
          eventId: task.calendarEventId,
        })
      } catch (error) {
        await repository.addDeleteOutbox(
          userId,
          task.calendarEventId,
          now().toISOString(),
          error.message,
        )
      }
    },
  }
}

function calendarTask(task) {
  return {
    ...task,
    title: task.status === 'completed' ? `Done: ${task.title}` : task.title,
  }
}

function parseGoogleDateTime(dateTime) {
  const tIdx = dateTime.indexOf('T')
  const scheduledOn = dateTime.slice(0, tIdx)
  const time = dateTime.slice(tIdx + 1, tIdx + 6)
  return { scheduledOn, time }
}
