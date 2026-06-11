export function createSleepRepository(db) {
  return {
    get(userId, id) {
      return db.prepare(`
        SELECT
          id,
          type,
          slept_at AS sleptAt,
          woke_at AS wokeAt,
          duration_minutes AS durationMinutes,
          quality,
          notes,
          recorded_on AS recordedOn,
          created_at AS createdAt
        FROM sleep_logs WHERE user_id = ? AND id = ?
      `).get(userId, id)
    },

    list(userId, limit = 30) {
      return db.prepare(`
        SELECT
          id,
          type,
          slept_at AS sleptAt,
          woke_at AS wokeAt,
          duration_minutes AS durationMinutes,
          quality,
          notes,
          recorded_on AS recordedOn,
          created_at AS createdAt
        FROM sleep_logs
        WHERE user_id = ?
        ORDER BY recorded_on DESC, created_at DESC
        LIMIT ?
      `).all(userId, limit)
    },

    insert(userId, log) {
      db.prepare(`
        INSERT INTO sleep_logs
          (id, user_id, type, slept_at, woke_at, duration_minutes, quality, notes, recorded_on, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        log.id,
        userId,
        log.type,
        log.sleptAt,
        log.wokeAt,
        log.durationMinutes,
        log.quality,
        log.notes,
        log.recordedOn,
        log.createdAt,
      )
      return this.get(userId, log.id)
    },

    delete(userId, id) {
      return db.prepare('DELETE FROM sleep_logs WHERE user_id = ? AND id = ?').run(userId, id)
    },
  }
}
