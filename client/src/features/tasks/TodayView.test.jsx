import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TodayView from './TodayView'

afterEach(cleanup)

const task = {
  id: 'task-1',
  title: 'Study for exam',
  notes: 'Chapter 4',
  area: 'school',
  priority: 'high',
  scheduledOn: '2026-06-06',
  startTime: '19:00',
  endTime: '20:00',
  status: 'open',
  calendarEnabled: true,
  syncStatus: 'synced',
  hasOverlap: false,
}

const groups = {
  date: '2026-06-06',
  inbox: [{ ...task, id: 'inbox', title: 'Capture idea', scheduledOn: null, startTime: null, endTime: null }],
  overdue: [{ ...task, id: 'old', title: 'Old assignment', scheduledOn: '2026-06-05', startTime: null, endTime: null }],
  anytime: [{ ...task, id: 'anytime', title: 'Submit project', startTime: null, endTime: null }],
  timed: [task],
  completed: [{ ...task, id: 'done', title: 'Morning review', status: 'completed' }],
}

function renderView(overrides = {}) {
  const props = {
    date: '2026-06-06',
    googleStatus: { configured: false, connected: false },
    onComplete: vi.fn(),
    onConnect: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined),
    onDateChange: vi.fn(),
    onDelete: vi.fn(),
    onDisconnect: vi.fn(),
    onReopen: vi.fn(),
    onRetrySync: vi.fn(),
    onUpdate: vi.fn(),
    tasks: groups,
    ...overrides,
  }
  render(<TodayView {...props} />)
  return props
}

describe('TodayView', () => {
  it('shows the daily sections and completes a timed task', () => {
    const props = renderView()
    expect(screen.getByText('Overdue')).toBeVisible()
    expect(screen.getByText('Old assignment')).toBeVisible()
    expect(screen.getByText('7:00 PM')).toBeVisible()
    expect(screen.getByText('Completed')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Complete Study for exam' }))
    expect(props.onComplete).toHaveBeenCalledWith('task-1')
  })

  it('creates a timed School task with calendar publishing enabled', async () => {
    const props = renderView({ googleStatus: { configured: true, connected: true } })
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Finish essay' } })
    fireEvent.click(screen.getByRole('button', { name: 'Task details' }))
    fireEvent.change(screen.getByLabelText('Area'), { target: { value: 'school' } })
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '16:00' } })
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '17:00' } })
    fireEvent.click(screen.getByLabelText('Add to Google Calendar'))
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Finish essay',
      area: 'school',
      scheduledOn: '2026-06-06',
      startTime: '16:00',
      endTime: '17:00',
      calendarEnabled: true,
    })))
  })

  it('reads native time-control values directly when the browser does not emit change', async () => {
    const props = renderView()
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Native time task' } })
    fireEvent.click(screen.getByRole('button', { name: 'Task details' }))
    const start = screen.getByLabelText('Start time')
    const end = screen.getByLabelText('End time')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(start, '09:30')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(end, '10:15')
    fireEvent.submit(screen.getByRole('button', { name: 'Add task' }).closest('form'))

    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      startTime: '09:30',
      endTime: '10:15',
    })))
  })

  it('uses the newly selected header date for the next quick task', async () => {
    const props = renderView()
    fireEvent.change(screen.getByLabelText('Schedule date'), {
      target: { value: '2026-06-08' },
    })
    fireEvent.change(screen.getByLabelText('Task title'), {
      target: { value: 'Monday task' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      scheduledOn: '2026-06-08',
    })))
  })
})
