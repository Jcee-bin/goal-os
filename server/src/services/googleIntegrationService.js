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

  function status() {
    const integration = repository.getIntegration(userId)
    return {
      configured,
      connected: Boolean(integration?.refreshTokenEncrypted),
      calendarId: integration?.calendarId || null,
      connectedAt: integration?.connectedAt || null,
    }
  }

  function requireConfigured() {
    if (!configured) {
      throw Object.assign(new Error('Google Calendar credentials are not configured'), { status: 503 })
    }
  }

  async function access() {
    const integration = repository.getIntegration(userId)
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
          repository.addDeleteOutbox(
            userId,
            task.calendarEventId,
            now().toISOString(),
            error.message,
          )
        }
      } else {
        repository.addDeleteOutbox(
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
    for (const item of repository.listOutbox(userId)) {
      try {
        await googleClient.deleteEvent({
          accessToken: auth.accessToken,
          calendarId: auth.integration.calendarId,
          eventId: item.eventId,
        })
        repository.deleteOutbox(item.id)
      } catch {
        // Keep the deletion queued for a future successful request.
      }
    }
  }

  return {
    status,

    connect() {
      requireConfigured()
      const state = crypto.randomUUID()
      const expiresAt = new Date(now().getTime() + 10 * 60 * 1000).toISOString()
      repository.saveState(userId, state, expiresAt)
      return { url: googleClient.authorizationUrl({ state }) }
    },

    async callback({ code, state }) {
      requireConfigured()
      if (!code || !state || !repository.consumeState(userId, state, now().toISOString())) {
        throw Object.assign(new Error('Invalid or expired Google authorization state'), { status: 400 })
      }
      const tokens = await googleClient.exchangeCode(code)
      if (!tokens.refreshToken) {
        throw Object.assign(new Error('Google did not return a refresh token'), { status: 400 })
      }
      const existing = repository.getIntegration(userId)
      const calendarId = await googleClient.ensureCalendar({
        accessToken: tokens.accessToken,
        calendarId: existing?.calendarId,
      })
      const timestamp = now().toISOString()
      const savedIntegration = repository.saveIntegration(userId, {
        refreshTokenEncrypted: encryptToken(tokens.refreshToken, config.tokenEncryptionKey),
        calendarId,
        connectedAt: timestamp,
        updatedAt: timestamp,
      })
      await flushOutbox({ accessToken: tokens.accessToken, integration: savedIntegration })
      for (const task of tasks.listPendingCalendar(userId)) await syncTask(task)
      return status()
    },

    disconnect() {
      repository.disconnect(userId, now().toISOString())
      return status()
    },

    syncTask,

    async deleteTask(task) {
      if (!task.calendarEventId) return
      const auth = await access()
      if (!auth) {
        repository.addDeleteOutbox(
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
        repository.addDeleteOutbox(
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
