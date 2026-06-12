export function createActivityRepository(db) {
  return {
    async getProfile(userId) {
      return db.prepare(`
        SELECT
          user_id AS userId,
          identity,
          arena,
          identity_confirmed AS identityConfirmed,
          legacy_imported AS legacyImported
        FROM profiles WHERE user_id = ?
      `).get(userId)
    },

    async updateProfile(userId, profile) {
      await db.prepare(`
        UPDATE profiles
        SET identity = ?, arena = ?, identity_confirmed = ?
        WHERE user_id = ?
      `).run(profile.identity, profile.arena, profile.identityConfirmed ? 1 : 0, userId)
      return this.getProfile(userId)
    },

    async listHabits(userId, date) {
      return db.prepare(`
        SELECT
          h.id,
          h.name,
          h.xp,
          h.target_per_day AS targetPerDay,
          h.cue,
          h.active,
          h.created_at AS createdAt,
          COUNT(c.id) AS completedToday
        FROM habits h
        LEFT JOIN habit_completions c
          ON c.habit_id = h.id AND c.user_id = h.user_id AND c.completed_on = ?
        WHERE h.user_id = ? AND h.active = 1
        GROUP BY h.id
        ORDER BY
          CASE h.cue
            WHEN 'morning' THEN 1
            WHEN 'afternoon' THEN 2
            WHEN 'night' THEN 3
            ELSE 4
          END,
          h.created_at ASC
      `).all(date, userId)
    },

    async getHabit(userId, id) {
      return db.prepare(`
        SELECT
          id, name, xp, target_per_day AS targetPerDay, cue, active,
          created_at AS createdAt
        FROM habits WHERE user_id = ? AND id = ?
      `).get(userId, id)
    },

    async insertHabit(userId, habit) {
      await db.prepare(`
        INSERT INTO habits
          (id, user_id, name, xp, target_per_day, cue, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        habit.id,
        userId,
        habit.name,
        habit.xp,
        habit.targetPerDay,
        habit.cue,
        habit.createdAt,
      )
      return this.getHabit(userId, habit.id)
    },

    async updateHabit(userId, id, habit) {
      await db.prepare(`
        UPDATE habits
        SET name = ?, xp = ?, target_per_day = ?, cue = ?
        WHERE user_id = ? AND id = ?
      `).run(habit.name, habit.xp, habit.targetPerDay, habit.cue, userId, id)
      return this.getHabit(userId, id)
    },

    async deleteHabit(userId, id) {
      return db.prepare('DELETE FROM habits WHERE user_id = ? AND id = ?').run(userId, id)
    },

    async countHabitCompletions(userId, habitId, date) {
      const row = await db.prepare(`
        SELECT COUNT(*) AS count
        FROM habit_completions
        WHERE user_id = ? AND habit_id = ? AND completed_on = ?
      `).get(userId, habitId, date)
      return row.count
    },

    async insertHabitCompletion(userId, completion) {
      await db.prepare(`
        INSERT INTO habit_completions
          (id, user_id, habit_id, completed_on, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        completion.id,
        userId,
        completion.habitId,
        completion.eventOn,
        completion.createdAt,
      )
    },

    async completionDates(userId, habitId) {
      return db.prepare(`
        SELECT completed_on AS completedOn
        FROM habit_completions
        WHERE user_id = ? AND habit_id = ?
        GROUP BY completed_on
      `).all(userId, habitId)
    },

    async listGoals(userId) {
      return db.prepare(`
        SELECT
          id, name, target, current, unit, cadence,
          week_key AS weekKey,
          completion_awarded AS completionAwarded,
          created_at AS createdAt
        FROM goals
        WHERE user_id = ?
        ORDER BY created_at ASC
      `).all(userId)
    },

    async getGoal(userId, id) {
      return db.prepare(`
        SELECT
          id, name, target, current, unit, cadence,
          week_key AS weekKey,
          completion_awarded AS completionAwarded,
          created_at AS createdAt
        FROM goals
        WHERE user_id = ? AND id = ?
      `).get(userId, id)
    },

    async insertGoal(userId, goal) {
      await db.prepare(`
        INSERT INTO goals
          (id, user_id, name, target, current, unit, cadence, week_key,
           completion_awarded, created_at)
        VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, ?)
      `).run(
        goal.id,
        userId,
        goal.name,
        goal.target,
        goal.unit,
        goal.cadence,
        goal.weekKey,
        goal.createdAt,
      )
      return this.getGoal(userId, goal.id)
    },

    async updateGoal(userId, id, goal) {
      await db.prepare(`
        UPDATE goals
        SET name = ?, target = ?, unit = ?, cadence = ?, week_key = ?
        WHERE user_id = ? AND id = ?
      `).run(goal.name, goal.target, goal.unit, goal.cadence, goal.weekKey, userId, id)
      return this.getGoal(userId, id)
    },

    async setGoalProgress(userId, id, current, completionAwarded, weekKey) {
      await db.prepare(`
        UPDATE goals
        SET current = ?, completion_awarded = ?, week_key = ?
        WHERE user_id = ? AND id = ?
      `).run(current, completionAwarded ? 1 : 0, weekKey, userId, id)
    },

    async resetWeeklyGoals(userId, weekKey) {
      await db.prepare(`
        UPDATE goals
        SET current = 0, completion_awarded = 0, week_key = ?
        WHERE user_id = ? AND cadence = 'weekly' AND week_key <> ?
      `).run(weekKey, userId, weekKey)
    },

    async insertGoalProgress(userId, event) {
      await db.prepare(`
        INSERT INTO goal_progress_events
          (id, user_id, goal_id, amount, event_on, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(event.id, userId, event.goalId, event.amount, event.eventOn, event.createdAt)
    },

    async deleteGoal(userId, id) {
      return db.prepare('DELETE FROM goals WHERE user_id = ? AND id = ?').run(userId, id)
    },

    async insertEvidence(userId, event) {
      await db.prepare(`
        INSERT INTO evidence_entries
          (id, user_id, source_type, source_id, description, xp_delta, event_on, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        event.id,
        userId,
        event.sourceType,
        event.sourceId,
        event.description,
        event.xpDelta,
        event.eventOn,
        event.createdAt,
      )
    },

    async insertXp(userId, event) {
      await db.prepare(`
        INSERT INTO xp_events
          (id, user_id, source_type, source_id, amount, event_on, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        event.id,
        userId,
        event.sourceType,
        event.sourceId,
        event.amount,
        event.eventOn,
        event.createdAt,
      )
    },

    async listEvidence(userId, limit = 20) {
      return db.prepare(`
        SELECT
          id,
          source_type AS sourceType,
          source_id AS sourceId,
          description,
          xp_delta AS xpDelta,
          event_on AS eventOn,
          created_at AS createdAt
        FROM evidence_entries
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(userId, limit)
    },

    async xpSummary(userId, date) {
      return db.prepare(`
        SELECT
          COALESCE(SUM(amount), 0) AS totalXp,
          COALESCE(SUM(CASE WHEN event_on = ? THEN amount ELSE 0 END), 0) AS todayXp
        FROM xp_events
        WHERE user_id = ?
      `).get(date, userId)
    },

    async completionCountsByDate(userId, startDate) {
      return db.prepare(`
        SELECT completed_on AS date, COUNT(*) AS count
        FROM habit_completions
        WHERE user_id = ? AND completed_on >= ?
        GROUP BY completed_on
        ORDER BY completed_on
      `).all(userId, startDate)
    },

    async resetLogs(userId) {
      await db.prepare('DELETE FROM xp_events WHERE user_id = ?').run(userId)
      await db.prepare('DELETE FROM evidence_entries WHERE user_id = ?').run(userId)
      await db.prepare('DELETE FROM goal_progress_events WHERE user_id = ?').run(userId)
      await db.prepare('DELETE FROM habit_completions WHERE user_id = ?').run(userId)
      await db.prepare(`
        UPDATE goals SET current = 0, completion_awarded = 0 WHERE user_id = ?
      `).run(userId)
    },
  }
}
