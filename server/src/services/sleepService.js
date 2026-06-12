import { getDateKey, notFound, validationError } from '../domain.js'
import { createSleepRepository } from '../repositories/sleepRepository.js'

export function createSleepService({ db, userId, now = () => new Date() }) {
  const repository = createSleepRepository(db)

  return {
    async log(input) {
      const sleptAt = String(input.sleptAt ?? '').trim()
      const wokeAt = String(input.wokeAt ?? '').trim()

      if (!sleptAt) throw validationError('sleptAt', 'Sleep time is required')
      if (!wokeAt) throw validationError('wokeAt', 'Wake time is required')

      const slept = new Date(sleptAt)
      const woke = new Date(wokeAt)

      if (Number.isNaN(slept.getTime())) throw validationError('sleptAt', 'Invalid sleep time')
      if (Number.isNaN(woke.getTime())) throw validationError('wokeAt', 'Invalid wake time')
      if (woke <= slept) throw validationError('wokeAt', 'Wake time must be after sleep time')

      const durationMinutes = Math.round((woke - slept) / 60_000)
      if (durationMinutes > 1440) {
        throw validationError('wokeAt', 'Sleep duration cannot exceed 24 hours')
      }

      const quality = input.quality !== undefined ? Number(input.quality) : 3
      if (!Number.isInteger(quality) || quality < 1 || quality > 5) {
        throw validationError('quality', 'Quality must be an integer between 1 and 5')
      }

      const type = input.type === 'nap' ? 'nap' : 'night'
      // Guard: naps shouldn't be logged in the middle of the night (likely AM/PM error)
      if (type === 'nap') {
        const sleptHour = slept.getHours()
        const wokeHour = woke.getHours()
        if (sleptHour >= 0 && sleptHour < 6 && wokeHour >= 0 && wokeHour < 8) {
          throw validationError('sleptAt', 'Nap time looks wrong — are you sure it wasn\'t PM?')
        }
      }
      const notes = String(input.notes ?? '').trim().slice(0, 500)
      const recordedOn = getDateKey(slept)

      return repository.insert(userId, {
        id: crypto.randomUUID(),
        type,
        sleptAt,
        wokeAt,
        durationMinutes,
        quality,
        notes,
        recordedOn,
        createdAt: now().toISOString(),
      })
    },

    async remove(id) {
      const result = await repository.delete(userId, id)
      if (result.changes === 0) throw notFound('Sleep log not found')
    },

    async listRecent() {
      return repository.list(userId, 30)
    },

    async analytics() {
      const logs = await repository.list(userId, 30)

      const today = getDateKey(now())
      const cutoff = getDateKey(new Date(now().getTime() - 6 * 24 * 60 * 60 * 1000))
      const inRange = logs.filter((l) => l.recordedOn >= cutoff && l.recordedOn <= today)

      // nights only for chart + debt + avg
      const last7 = inRange.filter((l) => (l.type ?? 'night') === 'night')
      const recentNaps = inRange.filter((l) => l.type === 'nap')

      const avgMinutes = last7.length > 0
        ? Math.round(last7.reduce((sum, l) => sum + l.durationMinutes, 0) / last7.length)
        : 0

      // sleep debt: per night actual vs 8h (480 min), nights only
      const sleepDebtMinutes = last7.reduce((sum, l) => sum + Math.max(0, 480 - l.durationMinutes), 0)

      // streak: consecutive calendar days (nights only) ending today (walk back from yesterday)
      const loggedNightDays = new Set(logs.filter((l) => (l.type ?? 'night') === 'night').map((l) => l.recordedOn))
      let streak = 0
      const cursor = new Date(now())
      cursor.setDate(cursor.getDate() - 1)
      while (loggedNightDays.has(getDateKey(cursor))) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      }

      const lastNight = logs.find((l) => (l.type ?? 'night') === 'night')
      const lastQuality = lastNight ? lastNight.quality : null

      return { avgMinutes, sleepDebtMinutes, streak, lastQuality, last7, recentNaps }
    },
  }
}
