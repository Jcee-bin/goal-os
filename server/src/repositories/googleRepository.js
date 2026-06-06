export function createGoogleRepository(db) {
  return {
    getIntegration(userId) {
      return db.prepare(`
        SELECT
          user_id AS userId,
          refresh_token_encrypted AS refreshTokenEncrypted,
          calendar_id AS calendarId,
          connected_at AS connectedAt,
          updated_at AS updatedAt
        FROM google_integrations WHERE user_id = ?
      `).get(userId)
    },

    saveIntegration(userId, integration) {
      db.prepare(`
        INSERT INTO google_integrations (
          user_id, refresh_token_encrypted, calendar_id, connected_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          refresh_token_encrypted = excluded.refresh_token_encrypted,
          calendar_id = excluded.calendar_id,
          connected_at = excluded.connected_at,
          updated_at = excluded.updated_at
      `).run(
        userId,
        integration.refreshTokenEncrypted,
        integration.calendarId,
        integration.connectedAt,
        integration.updatedAt,
      )
      return this.getIntegration(userId)
    },

    disconnect(userId, updatedAt) {
      db.prepare(`
        UPDATE google_integrations
        SET refresh_token_encrypted = NULL, connected_at = NULL, updated_at = ?
        WHERE user_id = ?
      `).run(updatedAt, userId)
      return this.getIntegration(userId)
    },

    saveState(userId, state, expiresAt) {
      db.prepare(`
        INSERT INTO google_oauth_states (state, user_id, expires_at) VALUES (?, ?, ?)
      `).run(state, userId, expiresAt)
    },

    consumeState(userId, state, currentTime) {
      const row = db.prepare(`
        SELECT state FROM google_oauth_states
        WHERE state = ? AND user_id = ? AND expires_at >= ?
      `).get(state, userId, currentTime)
      db.prepare('DELETE FROM google_oauth_states WHERE state = ?').run(state)
      return Boolean(row)
    },

    addDeleteOutbox(userId, eventId, createdAt, error) {
      db.prepare(`
        INSERT INTO calendar_outbox
          (id, user_id, event_id, operation, last_error, created_at)
        VALUES (?, ?, ?, 'delete', ?, ?)
      `).run(crypto.randomUUID(), userId, eventId, error, createdAt)
    },

    listOutbox(userId) {
      return db.prepare(`
        SELECT id, event_id AS eventId, operation
        FROM calendar_outbox WHERE user_id = ? ORDER BY created_at ASC
      `).all(userId)
    },

    deleteOutbox(id) {
      db.prepare('DELETE FROM calendar_outbox WHERE id = ?').run(id)
    },
  }
}
