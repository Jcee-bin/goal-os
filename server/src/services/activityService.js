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

  async function transaction(work) {
    await db.exec('BEGIN IMMEDIATE')
    try {
      const result = await work()
      await db.exec('COMMIT')
      return result
    } catch (error) {
      await db.exec('ROLLBACK')
      throw error
    }
  }

  async function award({ sourceType, sourceId, description, amount, time }) {
    await repository.insertXp(userId, {
      id: crypto.randomUUID(),
      sourceType,
      sourceId,
      amount,
      eventOn: time.eventOn,
      createdAt: time.createdAt,
    })
    await repository.insertEvidence(userId, {
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

  async function listHabits() {
    const time = clock()
    const habits = await repository.listHabits(userId, time.eventOn)
    return Promise.all(habits.map(async (habit) => ({
      ...habit,
      active: Boolean(habit.active),
      done: habit.completedToday >= habit.targetPerDay,
      streak: calculateStreak(await repository.completionDates(userId, habit.id), time.date),
    })))
  }

  async function listGoals() {
    const { weekKey } = clock()
    await repository.resetWeeklyGoals(userId, weekKey)
    const goals = await repository.listGoals(userId)
    return goals.map((goal) => ({
      ...goal,
      completionAwarded: Boolean(goal.completionAwarded),
      percent: Math.min(100, Math.round((goal.current / goal.target) * 100)),
    }))
  }

  async function analytics() {
    const time = clock()
    const habits = await listHabits()
    const targetVotes = habits.reduce((sum, habit) => sum + habit.targetPerDay, 0)
    const completedVotes = habits.reduce(
      (sum, habit) => sum + Math.min(habit.completedToday, habit.targetPerDay),
      0,
    )
    const sevenDaysAgo = new Date(time.date)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const counts = new Map(
      (await repository.completionCountsByDate(userId, getDateKey(sevenDaysAgo)))
        .map(({ date, count }) => [date, count]),
    )
    const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(sevenDaysAgo)
      day.setDate(day.getDate() + index)
      const date = getDateKey(day)
      return { date, count: counts.get(date) || 0 }
    })
    const xp = await repository.xpSummary(userId, time.eventOn)

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
    async getProfile() {
      const profile = await repository.getProfile(userId)
      return {
        ...profile,
        identityConfirmed: Boolean(profile.identityConfirmed),
        legacyImported: Boolean(profile.legacyImported),
      }
    },

    async updateProfile(input) {
      const existing = await this.getProfile()
      const next = {
        identity: requireText(input.identity ?? existing.identity, 'identity', 240),
        arena: requireText(input.arena ?? existing.arena, 'arena', 80),
        identityConfirmed: input.identityConfirmed ?? existing.identityConfirmed,
      }
      const changed = next.identity !== existing.identity || next.arena !== existing.arena
      return transaction(async () => {
        const profile = await repository.updateProfile(userId, next)
        if (changed) {
          const time = clock()
          await award({
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

    async createHabit(input) {
      const habit = normalizeHabit(input)
      return repository.insertHabit(userId, {
        id: crypto.randomUUID(),
        ...habit,
        createdAt: clock().createdAt,
      })
    },

    async updateHabit(id, input) {
      const existing = await repository.getHabit(userId, id)
      if (!existing) throw notFound('Habit not found')
      return repository.updateHabit(userId, id, normalizeHabit(input, existing))
    },

    async deleteHabit(id) {
      const result = await repository.deleteHabit(userId, id)
      if (!result.changes) throw notFound('Habit not found')
      return { deleted: true }
    },

    async completeHabit(id) {
      const habit = await repository.getHabit(userId, id)
      if (!habit) throw notFound('Habit not found')
      const time = clock()
      const count = await repository.countHabitCompletions(userId, id, time.eventOn)
      if (count >= habit.targetPerDay) throw conflict('Habit is already complete for today')

      return transaction(async () => {
        await repository.insertHabitCompletion(userId, {
          id: crypto.randomUUID(),
          habitId: id,
          eventOn: time.eventOn,
          createdAt: time.createdAt,
        })
        await award({
          sourceType: 'habit',
          sourceId: id,
          description: habit.name,
          amount: habit.xp,
          time,
        })
        const habits = await listHabits()
        return habits.find((item) => item.id === id)
      })
    },

    listGoals,

    async createGoal(input) {
      const time = clock()
      const goal = normalizeGoal(input, {}, time.weekKey)
      return repository.insertGoal(userId, {
        id: crypto.randomUUID(),
        ...goal,
        createdAt: time.createdAt,
      })
    },

    async updateGoal(id, input) {
      const existing = await repository.getGoal(userId, id)
      if (!existing) throw notFound('Goal not found')
      return repository.updateGoal(userId, id, normalizeGoal(input, existing, clock().weekKey))
    },

    async deleteGoal(id) {
      const result = await repository.deleteGoal(userId, id)
      if (!result.changes) throw notFound('Goal not found')
      return { deleted: true }
    },

    async progressGoal(id, amountInput = 1) {
      const time = clock()
      await repository.resetWeeklyGoals(userId, time.weekKey)
      const goal = await repository.getGoal(userId, id)
      if (!goal) throw notFound('Goal not found')
      if (goal.current >= goal.target) throw conflict('Goal is already complete')
      const amount = requirePositiveInteger(amountInput, 'amount', goal.target)
      const current = Math.min(goal.target, goal.current + amount)
      const justCompleted = current >= goal.target && !goal.completionAwarded

      return transaction(async () => {
        await repository.setGoalProgress(
          userId,
          id,
          current,
          goal.completionAwarded || justCompleted,
          goal.cadence === 'weekly' ? time.weekKey : '',
        )
        await repository.insertGoalProgress(userId, {
          id: crypto.randomUUID(),
          goalId: id,
          amount: current - goal.current,
          eventOn: time.eventOn,
          createdAt: time.createdAt,
        })
        await award({
          sourceType: 'goal-progress',
          sourceId: id,
          description: `Progressed: ${goal.name}`,
          amount: GOAL_PROGRESS_XP,
          time,
        })
        if (justCompleted) {
          await award({
            sourceType: 'goal-complete',
            sourceId: id,
            description: `Completed goal: ${goal.name}`,
            amount: GOAL_COMPLETION_XP,
            time,
          })
        }
        const goals = await listGoals()
        return goals.find((item) => item.id === id)
      })
    },

    async listEvidence(limit = 20) {
      return repository.listEvidence(userId, Math.min(100, Math.max(1, Number(limit) || 20)))
    },

    analytics,

    async dashboard() {
      const time = clock()
      const profile = await this.getProfile()
      const habits = await listHabits()
      const goals = await listGoals()
      const activity = await analytics()
      return {
        profile: {
          ...profile,
          xp: activity.totalXp,
        },
        habits,
        goals,
        evidence: await repository.listEvidence(userId, 8),
        analytics: activity,
        today: time.eventOn,
      }
    },

    async resetLogs() {
      await transaction(async () => repository.resetLogs(userId))
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
