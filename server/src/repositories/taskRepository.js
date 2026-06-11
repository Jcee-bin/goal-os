function mapTask(row) {
  if (!row) return row
  return {
    ...row,
    calendarEnabled: Boolean(row.calendarEnabled),
    hasOverlap: Boolean(row.hasOverlap),
  }
}

const select = `
  SELECT
    id, title, notes, area, priority,
    scheduled_on AS scheduledOn,
    start_time AS startTime,
    end_time AS endTime,
    status,
    calendar_enabled AS calendarEnabled,
    calendar_event_id AS calendarEventId,
    sync_status AS syncStatus,
    sync_error AS syncError,
    completed_on AS completedOn,
    completed_at AS completedAt,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM tasks
`

export function createTaskRepository(db) {
  return {
    list(userId) {
      return db.prepare(`${select} WHERE user_id = ? ORDER BY created_at ASC`)
        .all(userId)
        .map(mapTask)
    },

    get(userId, id) {
      return mapTask(db.prepare(`${select} WHERE user_id = ? AND id = ?`).get(userId, id))
    },

    insert(userId, task) {
      db.prepare(`
        INSERT INTO tasks (
          id, user_id, title, notes, area, priority, scheduled_on,
          start_time, end_time, status, calendar_enabled, calendar_event_id,
          sync_status, sync_error, completed_on, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, NULL, NULL, NULL, ?, ?)
      `).run(
        task.id,
        userId,
        task.title,
        task.notes,
        task.area,
        task.priority,
        task.scheduledOn,
        task.startTime,
        task.endTime,
        task.calendarEnabled ? 1 : 0,
        task.calendarEventId ?? null,
        task.syncStatus,
        task.createdAt,
        task.updatedAt,
      )
      return this.get(userId, task.id)
    },

    update(userId, id, task) {
      db.prepare(`
        UPDATE tasks
        SET title = ?, notes = ?, area = ?, priority = ?, scheduled_on = ?,
            start_time = ?, end_time = ?, calendar_enabled = ?,
            sync_status = ?, sync_error = NULL, updated_at = ?
        WHERE user_id = ? AND id = ?
      `).run(
        task.title,
        task.notes,
        task.area,
        task.priority,
        task.scheduledOn,
        task.startTime,
        task.endTime,
        task.calendarEnabled ? 1 : 0,
        task.syncStatus,
        task.updatedAt,
        userId,
        id,
      )
      return this.get(userId, id)
    },

    setStatus(userId, id, status, completedOn, completedAt, updatedAt) {
      db.prepare(`
        UPDATE tasks
        SET status = ?, completed_on = ?, completed_at = ?, updated_at = ?,
            sync_status = CASE WHEN calendar_enabled = 1 THEN 'pending' ELSE sync_status END
        WHERE user_id = ? AND id = ?
      `).run(status, completedOn, completedAt, updatedAt, userId, id)
      return this.get(userId, id)
    },

    delete(userId, id) {
      return db.prepare('DELETE FROM tasks WHERE user_id = ? AND id = ?').run(userId, id)
    },

    setCalendarState(userId, id, { eventId, syncStatus, syncError }) {
      db.prepare(`
        UPDATE tasks
        SET calendar_event_id = ?, sync_status = ?, sync_error = ?, updated_at = ?
        WHERE user_id = ? AND id = ?
      `).run(eventId ?? null, syncStatus, syncError ?? null, new Date().toISOString(), userId, id)
      return this.get(userId, id)
    },

    getByCalendarEventId(userId, calendarEventId) {
      return mapTask(
        db.prepare(`${select} WHERE user_id = ? AND calendar_event_id = ?`).get(userId, calendarEventId),
      )
    },

    applyInboundSync(userId, id, { title, notes, scheduledOn, startTime, endTime, updatedAt }) {
      db.prepare(`
        UPDATE tasks
        SET title = ?, notes = ?, scheduled_on = ?, start_time = ?, end_time = ?,
            sync_status = 'synced', sync_error = NULL, updated_at = ?
        WHERE user_id = ? AND id = ?
      `).run(title, notes, scheduledOn, startTime, endTime, updatedAt, userId, id)
      return this.get(userId, id)
    },

    unlinkCalendar(userId, id, updatedAt) {
      db.prepare(`
        UPDATE tasks
        SET calendar_event_id = NULL, calendar_enabled = 0,
            sync_status = 'local', sync_error = NULL, updated_at = ?
        WHERE user_id = ? AND id = ?
      `).run(updatedAt, userId, id)
      return this.get(userId, id)
    },

    listPendingCalendar(userId) {
      return db.prepare(`
        ${select}
        WHERE user_id = ? AND calendar_enabled = 1
          AND scheduled_on IS NOT NULL AND start_time IS NOT NULL
          AND sync_status IN ('pending', 'failed')
        ORDER BY created_at ASC
      `).all(userId).map(mapTask)
    },
  }
}
