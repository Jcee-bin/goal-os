const calendarApi = 'https://www.googleapis.com/calendar/v3'

export function createGoogleCalendarClient(config) {
  async function googleFetch(url, options = {}) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
      const response = await fetch(url, { ...options, signal: controller.signal })
      if (response.status === 204) return null
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(body.error?.message || 'Google Calendar request failed')
        error.status = response.status
        throw error
      }
      return body
    } finally {
      clearTimeout(timeout)
    }
  }

  return {
    authorizationUrl({ state }) {
      const query = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar',
        access_type: 'offline',
        prompt: 'consent',
        state,
      })
      return `https://accounts.google.com/o/oauth2/v2/auth?${query}`
    },

    async exchangeCode(code) {
      const body = new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      })
      const tokens = await googleFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      })
      return { refreshToken: tokens.refresh_token, accessToken: tokens.access_token }
    },

    async refreshAccessToken(refreshToken) {
      const body = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
      })
      const tokens = await googleFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      })
      return tokens.access_token
    },

    async ensureCalendar({ accessToken, calendarId }) {
      const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }
      if (calendarId) {
        try {
          await googleFetch(`${calendarApi}/calendars/${encodeURIComponent(calendarId)}`, { headers })
          return calendarId
        } catch (error) {
          if (error.status !== 404) throw error
        }
      }
      const calendar = await googleFetch(`${calendarApi}/calendars`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ summary: 'Goal OS', timeZone: config.timeZone }),
      })
      return calendar.id
    },

    async upsertEvent({ accessToken, calendarId, eventId, task, timeZone }) {
      const body = {
        summary: task.title,
        description: task.notes || '',
        start: { dateTime: `${task.scheduledOn}T${task.startTime}:00`, timeZone },
        end: { dateTime: `${task.scheduledOn}T${task.endTime}:00`, timeZone },
        extendedProperties: { private: { goalOsTaskId: task.id } },
      }
      const path = `${calendarApi}/calendars/${encodeURIComponent(calendarId)}/events`
      const event = await googleFetch(eventId ? `${path}/${encodeURIComponent(eventId)}` : path, {
        method: eventId ? 'PATCH' : 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      return event.id
    },

    async deleteEvent({ accessToken, calendarId, eventId }) {
      try {
        await googleFetch(
          `${calendarApi}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          { method: 'DELETE', headers: { authorization: `Bearer ${accessToken}` } },
        )
      } catch (error) {
        if (error.status !== 404 && error.status !== 410) throw error
      }
    },

    async listEvents({ accessToken, calendarId, updatedMin, pageToken }) {
      const params = new URLSearchParams({ singleEvents: 'true', showDeleted: 'true' })
      if (updatedMin) params.set('updatedMin', updatedMin)
      if (pageToken) params.set('pageToken', pageToken)
      return googleFetch(
        `${calendarApi}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      )
    },
  }
}
