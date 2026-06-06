import {
  cadences,
  conflict,
  cues,
  getDateKey,
  getWeekKey,
  notFound,
  requireEnum,
  requirePositiveInteger,
  requireText,
} from '../domain.js'
import { createActivityRepository } from '../repositories/activityRepository.js'

const GOAL_PROGRESS_XP = 20
const GOAL_COMPLETION_XP = 50
const IDENTITY_XP = 5

export function createActivityService({ db, userId, now = () => new Date() }) {
  const repository = createActivityRepository(db)

  function clock() {
    const date = now()
    return {
      date,
      eventOn: getDateKey(date),
      weekKey: getWeekKey(date),
      createdAt: date.toISOString(),
    }
  }

  function transaction(work) {
    db.exec('BEGIN IMMEDIATE')
    try {
      const result = work()
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  function award({ sourceType, sourceId, description, amount, time }) {
    repository.insertXp(userId, {
      id: crypto.randomUUID(),
      sourceType,
      sourceId,
      amount,
      eventOn: time.eventOn,
      createdAt: time.createdAt,
    })
    repository.insertEvidence(userId, {
      id: crypto.randomUUID(),
      sourceType,
      sourceId,
      description,
      xpDelta: amount,
      eventOn: time.eventOn,
      createdAt: time.createdAt,
    })
  }

  function normalizeHabit(input, existing = {}) {
    return {
      name: requireText(input.name ?? existing.name, 'name', 120),
      xp: requirePositiveInteger(input.xp ?? existing.xp, 'xp', 100),
      targetPerDay: requirePositiveInteger(
        input.targetPerDay ?? existing.targetPerDay,
        'targetPerDay',
        20,
      ),
      cue: requireEnum(input.cue ?? existing.cue, 'cue', cues),
    }
  }

  function normalizeGoal(input, existing = {}, weekKey) {
    const cadence = requireEnum(input.cadence ?? existing.cadence, 'cadence', cadences)
    return {
      name: requireText(input.name ?? existing.name, 'name', 160),
      target: requirePositiveInteger(input.target ?? existing.target, 'target', 100000),
      unit: requireText(input.unit ?? existing.unit ?? 'times', 'unit', 30),
      cadence,
      weekKey: cadence === 'weekly' ? existing.weekKey || weekKey : '',
    }
  }

  function listHabits() {
    const time = clock()
    return repository.listHabits(userId, time.eventOn).map((habit) => ({
      ...habit,
      active: Boolean(habit.active),
      done: habit.completedToday >= habit.targetPerDay,
      streak: calculateStreak(repository.completionDates(userId, habit.id), time.date),
    }))
  }

  function listGoals() {
    const { weekKey } = clock()
    repository.resetWeeklyGoals(userId, weekKey)
    return repository.listGoals(userId).map((goal) => ({
      ...goal,
      completionAwarded: Boolean(goal.completionAwarded),
      percent: Math.min(100, Math.round((goal.current / goal.target) * 100)),
    }))
  }

  function analytics() {
    const time = clock()
    const habits = listHabits()
    const targetVotes = habits.reduce((sum, habit) => sum + habit.targetPerDay, 0)
    const completedVotes = habits.reduce(
      (sum, habit) => sum + Math.min(habit.completedToday, habit.targetPerDay),
      0,
    )
    const sevenDaysAgo = new Date(time.date)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const counts = new Map(
      repository.completionCountsByDate(userId, getDateKey(sevenDaysAgo))
        .map(({ date, count }) => [date, count]),
    )
    const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(sevenDaysAgo)
      day.setDate(day.getDate() + index)
      const date = getDateKey(day)
      return { date, count: counts.get(date) || 0 }
    })
    const xp = repository.xpSummary(userId, time.eventOn)

    return {
      productivity: targetVotes ? Math.round((completedVotes / targetVotes) * 100) : 0,
      completedHabits: habits.filter((habit) => habit.done).length,
      totalHabits: habits.length,
      completedVotes,
      targetVotes,
      bestStreak: Math.max(0, ...habits.map((habit) => habit.streak)),
      todayXp: xp.todayXp,
      totalXp: xp.totalXp,
      weeklyTrend,
    }
  }

  return {
    getProfile() {
      const profile = repository.getProfile(userId)
      return {
        ...profile,
        identityConfirmed: Boolean(profile.identityConfirmed),
        legacyImported: Boolean(profile.legacyImported),
      }
    },

    updateProfile(input) {
      const existing = this.getProfile()
      const next = {
        identity: requireText(input.identity ?? existing.identity, 'identity', 240),
        arena: requireText(input.arena ?? existing.arena, 'arena', 80),
        identityConfirmed: input.identityConfirmed ?? existing.identityConfirmed,
      }
      const changed = next.identity !== existing.identity || next.arena !== existing.arena
      return transaction(() => {
        const profile = repository.updateProfile(userId, next)
        if (changed) {
          const time = clock()
          award({
            sourceType: 'identity',
            sourceId: userId,
            description: 'Identity updated',
            amount: IDENTITY_XP,
            time,
          })
        }
        return { ...profile, identityConfirmed: Boolean(profile.identityConfirmed) }
      })
    },

    listHabits,

    createHabit(input) {
      const habit = normalizeHabit(input)
      return repository.insertHabit(userId, {
        id: crypto.randomUUID(),
        ...habit,
        createdAt: clock().createdAt,
      })
    },

    updateHabit(id, input) {
      const existing = repository.getHabit(userId, id)
      if (!existing) throw notFound('Habit not found')
      return repository.updateHabit(userId, id, normalizeHabit(input, existing))
    },

    deleteHabit(id) {
      const result = repository.deleteHabit(userId, id)
      if (!result.changes) throw notFound('Habit not found')
      return { deleted: true }
    },

    completeHabit(id) {
      const habit = repository.getHabit(userId, id)
      if (!habit) throw notFound('Habit not found')
      const time = clock()
      const count = repository.countHabitCompletions(userId, id, time.eventOn)
      if (count >= habit.targetPerDay) throw conflict('Habit is already complete for today')

      return transaction(() => {
        repository.insertHabitCompletion(userId, {
          id: crypto.randomUUID(),
          habitId: id,
          eventOn: time.eventOn,
          createdAt: time.createdAt,
        })
        award({
          sourceType: 'habit',
          sourceId: id,
          description: habit.name,
          amount: habit.xp,
          time,
        })
        return listHabits().find((item) => item.id === id)
      })
    },

    listGoals,

    createGoal(input) {
      const time = clock()
      const goal = normalizeGoal(input, {}, time.weekKey)
      return repository.insertGoal(userId, {
        id: crypto.randomUUID(),
        ...goal,
        createdAt: time.createdAt,
      })
    },

    updateGoal(id, input) {
      const existing = repository.getGoal(userId, id)
      if (!existing) throw notFound('Goal not found')
      return repository.updateGoal(userId, id, normalizeGoal(input, existing, clock().weekKey))
    },

    deleteGoal(id) {
      const result = repository.deleteGoal(userId, id)
      if (!result.changes) throw notFound('Goal not found')
      return { deleted: true }
    },

    progressGoal(id, amountInput = 1) {
      const time = clock()
      repository.resetWeeklyGoals(userId, time.weekKey)
      const goal = repository.getGoal(userId, id)
      if (!goal) throw notFound('Goal not found')
      if (goal.current >= goal.target) throw conflict('Goal is already complete')
      const amount = requirePositiveInteger(amountInput, 'amount', goal.target)
      const current = Math.min(goal.target, goal.current + amount)
      const justCompleted = current >= goal.target && !goal.completionAwarded

      return transaction(() => {
        repository.setGoalProgress(
          userId,
          id,
          current,
          goal.completionAwarded || justCompleted,
          goal.cadence === 'weekly' ? time.weekKey : '',
        )
        repository.insertGoalProgress(userId, {
          id: crypto.randomUUID(),
          goalId: id,
          amount: current - goal.current,
          eventOn: time.eventOn,
          createdAt: time.createdAt,
        })
        award({
          sourceType: 'goal-progress',
          sourceId: id,
          description: `Progressed: ${goal.name}`,
          amount: GOAL_PROGRESS_XP,
          time,
        })
        if (justCompleted) {
          award({
            sourceType: 'goal-complete',
            sourceId: id,
            description: `Completed goal: ${goal.name}`,
            amount: GOAL_COMPLETION_XP,
            time,
          })
        }
        return listGoals().find((item) => item.id === id)
      })
    },

    listEvidence(limit = 20) {
      return repository.listEvidence(userId, Math.min(100, Math.max(1, Number(limit) || 20)))
    },

    analytics,

    dashboard() {
      const profile = this.getProfile()
      const habits = listHabits()
      const goals = listGoals()
      const activity = analytics()
      return {
        profile: {
          ...profile,
          xp: activity.totalXp,
        },
        habits,
        goals,
        evidence: repository.listEvidence(userId, 8),
        analytics: activity,
      }
    },

    resetLogs() {
      transaction(() => repository.resetLogs(userId))
      return this.dashboard()
    },
  }
}

function calculateStreak(rows, today) {
  const dates = new Set(rows.map(({ completedOn }) => completedOn))
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let streak = 0
  while (dates.has(getDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
