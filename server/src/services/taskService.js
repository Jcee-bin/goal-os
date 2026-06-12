import {
  getDateKey,
  notFound,
  requireEnum,
  requireText,
  taskAreas,
  taskPriorities,
  validationError,
} from '../domain.js'
import { createTaskRepository } from '../repositories/taskRepository.js'

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

export function createTaskService({
  db,
  userId,
  calendarService,
  now = () => new Date(),
}) {
  const repository = createTaskRepository(db)

  function normalize(input, existing = {}) {
    const title = requireText(input.title ?? existing.title, 'title', 160)
    const notes = String(input.notes ?? existing.notes ?? '').trim().slice(0, 1000)
    const area = requireEnum(input.area ?? existing.area ?? 'personal', 'area', taskAreas)
    const priority = requireEnum(
      input.priority ?? existing.priority ?? 'normal',
      'priority',
      taskPriorities,
    )
    const scheduledOn = nullable(input.scheduledOn, existing.scheduledOn)
    const startTime = nullable(input.startTime, existing.startTime)
    const endTime = nullable(input.endTime, existing.endTime)
    const calendarEnabled = Boolean(input.calendarEnabled ?? existing.calendarEnabled)

    if (scheduledOn && !datePattern.test(scheduledOn)) {
      throw validationError('scheduledOn', 'scheduledOn must use YYYY-MM-DD')
    }
    if ((startTime && !timePattern.test(startTime)) || (endTime && !timePattern.test(endTime))) {
      throw validationError('time', 'Times must use HH:MM')
    }
    if (Boolean(startTime) !== Boolean(endTime)) {
      throw validationError('time', 'Start and end time are both required')
    }
    if (startTime && !scheduledOn) {
      throw validationError('scheduledOn', 'Timed tasks require a scheduled date')
    }
    if (startTime && endTime && toMinutes(endTime) <= toMinutes(startTime)) {
      throw validationError('endTime', 'End time must be after start time')
    }
    if (calendarEnabled && !startTime) {
      throw validationError('calendarEnabled', 'Only timed tasks can publish to Google Calendar')
    }

    return {
      title,
      notes,
      area,
      priority,
      scheduledOn,
      startTime,
      endTime,
      calendarEnabled,
      syncStatus: calendarEnabled ? 'pending' : 'local',
    }
  }

  async function withOverlap(task) {
    if (!task.startTime || task.status === 'completed') return { ...task, hasOverlap: false }
    const allTasks = await repository.list(userId)
    const hasOverlap = allTasks.some((candidate) => (
      candidate.id !== task.id
      && candidate.status === 'open'
      && candidate.scheduledOn === task.scheduledOn
      && candidate.startTime
      && candidate.startTime < task.endTime
      && candidate.endTime > task.startTime
    ))
    return { ...task, hasOverlap }
  }

  async function get(id) {
    const task = await repository.get(userId, id)
    if (!task) throw notFound('Task not found')
    return task
  }

  return {
    async list(date = getDateKey(now())) {
      if (!datePattern.test(date)) throw validationError('date', 'date must use YYYY-MM-DD')
      const allTasks = await repository.list(userId)
      const tasks = await Promise.all(allTasks.map(withOverlap))
      const open = tasks.filter((task) => task.status === 'open')
      return {
        date,
        inbox: open.filter((task) => !task.scheduledOn),
        overdue: open
          .filter((task) => task.scheduledOn && task.scheduledOn < date)
          .sort(taskSort),
        anytime: open
          .filter((task) => task.scheduledOn === date && !task.startTime)
          .sort(prioritySort),
        timed: open
          .filter((task) => task.scheduledOn === date && task.startTime)
          .sort((left, right) => left.startTime.localeCompare(right.startTime)),
        completed: tasks
          .filter((task) => task.status === 'completed' && task.completedOn === date)
          .sort(taskSort),
      }
    },

    async create(input) {
      const timestamp = now().toISOString()
      const task = await repository.insert(userId, {
        id: crypto.randomUUID(),
        ...normalize(input),
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      return withOverlap(await calendarService.syncTask(task))
    },

    async update(id, input) {
      const existing = await get(id)
      const task = await repository.update(userId, id, {
        ...normalize(input, existing),
        updatedAt: now().toISOString(),
      })
      return withOverlap(await calendarService.syncTask(task))
    },

    async complete(id) {
      await get(id)
      const timestamp = now().toISOString()
      return calendarService.syncTask(
        await repository.setStatus(
          userId,
          id,
          'completed',
          getDateKey(now()),
          timestamp,
          timestamp,
        ),
      )
    },

    async reopen(id) {
      await get(id)
      return withOverlap(await calendarService.syncTask(
        await repository.setStatus(userId, id, 'open', null, null, now().toISOString()),
      ))
    },

    async delete(id) {
      const task = await get(id)
      await repository.delete(userId, id)
      await calendarService.deleteTask(task)
      return { deleted: true }
    },

    async retry(id) {
      return withOverlap(await calendarService.syncTask(await get(id)))
    },
  }
}

function toMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function nullable(value, fallback) {
  if (value === undefined) return fallback ?? null
  const normalized = String(value ?? '').trim()
  return normalized || null
}

function prioritySort(left, right) {
  const weight = { high: 0, normal: 1, low: 2 }
  return weight[left.priority] - weight[right.priority]
}

function taskSort(left, right) {
  return (left.scheduledOn || '').localeCompare(right.scheduledOn || '')
    || (left.startTime || '').localeCompare(right.startTime || '')
    || prioritySort(left, right)
}
