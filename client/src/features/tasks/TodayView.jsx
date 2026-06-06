import {
  CalendarCheck,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Pencil,
  RefreshCcw,
  Trash2,
  Unplug,
} from 'lucide-react'
import { useMemo, useState } from 'react'

const emptyForm = (date) => ({
  title: '',
  notes: '',
  area: 'personal',
  priority: 'normal',
  scheduledOn: date,
  startTime: '',
  endTime: '',
  calendarEnabled: false,
})

export default function TodayView({
  date,
  googleStatus,
  onComplete,
  onConnect,
  onCreate,
  onDateChange,
  onDelete,
  onDisconnect,
  onReopen,
  onRetrySync,
  onUpdate,
  tasks,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(() => emptyForm(date))
  const [error, setError] = useState('')
  const totalOpen = tasks.inbox.length + tasks.overdue.length + tasks.anytime.length + tasks.timed.length

  const formattedDate = useMemo(() => new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`)), [date])

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const data = new FormData(event.currentTarget)
      const payload = {
        title: String(data.get('title') || form.title),
        notes: String(data.get('notes') || ''),
        area: String(data.get('area') || form.area),
        priority: String(data.get('priority') || form.priority),
        scheduledOn: String(data.get('scheduledOn') || form.scheduledOn || '') || null,
        startTime: String(data.get('startTime') || '') || null,
        endTime: String(data.get('endTime') || '') || null,
        calendarEnabled: data.get('calendarEnabled') === 'on',
      }
      if (editingId) await onUpdate(editingId, payload)
      else await onCreate(payload)
      setEditingId(null)
      setDetailsOpen(false)
      setForm(emptyForm(date))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function edit(task) {
    setEditingId(task.id)
    setDetailsOpen(true)
    setForm({
      title: task.title,
      notes: task.notes,
      area: task.area,
      priority: task.priority,
      scheduledOn: task.scheduledOn || '',
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      calendarEnabled: task.calendarEnabled,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setDetailsOpen(false)
    setForm(emptyForm(date))
  }

  function changeDay(offset) {
    const next = new Date(`${date}T12:00:00`)
    next.setDate(next.getDate() + offset)
    selectDate(toDateKey(next))
  }

  function selectDate(nextDate) {
    onDateChange(nextDate)
    setForm((current) => ({ ...current, scheduledOn: nextDate }))
  }

  return (
    <div className="today-view">
      <header className="today-header">
        <div>
          <span className="eyebrow">Daily command center</span>
          <h1>Today</h1>
          <p>{formattedDate} · {totalOpen} open</p>
        </div>
        <div className="date-switcher">
          <button aria-label="Previous day" onClick={() => changeDay(-1)} type="button"><ChevronLeft size={18} /></button>
          <input aria-label="Schedule date" onChange={(event) => selectDate(event.target.value)} type="date" value={date} />
          <button aria-label="Next day" onClick={() => changeDay(1)} type="button"><ChevronRight size={18} /></button>
        </div>
      </header>

      <section className="today-top-grid">
        <form className="panel task-compose" onSubmit={submit}>
          <div className="task-quick-row">
            <input
              aria-label="Task title"
              name="title"
              onChange={(event) => setField('title', event.target.value)}
              placeholder="What needs to get done?"
              required
              value={form.title}
            />
            <button
              aria-expanded={detailsOpen}
              aria-label="Task details"
              className="details-toggle"
              onClick={() => setDetailsOpen((open) => !open)}
              type="button"
            >
              <ChevronDown size={17} /> Details
            </button>
            <button className="primary-button" type="submit">{editingId ? 'Save task' : 'Add task'}</button>
          </div>
          {detailsOpen && (
            <div className="task-details-grid">
              <label>Area<select aria-label="Area" name="area" onChange={(event) => setField('area', event.target.value)} value={form.area}>
                <option value="personal">Personal</option><option value="school">School</option>
                <option value="business">Business</option><option value="health">Health</option>
              </select></label>
              <label>Priority<select aria-label="Priority" name="priority" onChange={(event) => setField('priority', event.target.value)} value={form.priority}>
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
              </select></label>
              <label>Date<input aria-label="Task date" name="scheduledOn" onChange={(event) => setField('scheduledOn', event.target.value)} type="date" value={form.scheduledOn} /></label>
              <label>Start<input aria-label="Start time" name="startTime" onChange={(event) => setField('startTime', event.target.value)} type="time" value={form.startTime} /></label>
              <label>End<input aria-label="End time" name="endTime" onChange={(event) => setField('endTime', event.target.value)} type="time" value={form.endTime} /></label>
              <label className="task-notes">Notes<input aria-label="Task notes" name="notes" onChange={(event) => setField('notes', event.target.value)} placeholder="Optional context" value={form.notes} /></label>
              <label className="calendar-check">
                <input
                  aria-label="Add to Google Calendar"
                  checked={form.calendarEnabled}
                  disabled={!form.startTime || !form.endTime}
                  name="calendarEnabled"
                  onChange={(event) => setField('calendarEnabled', event.target.checked)}
                  type="checkbox"
                />
                Add to Google Calendar
              </label>
              {editingId && <button className="text-button" onClick={cancelEdit} type="button">Cancel editing</button>}
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
        </form>

        <CalendarConnection
          googleStatus={googleStatus}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      </section>

      <section className="today-board">
        <TaskSection
          className="overdue-section"
          empty="Nothing overdue."
          onComplete={onComplete}
          onDelete={onDelete}
          onEdit={edit}
          onRetrySync={onRetrySync}
          tasks={tasks.overdue}
          title="Overdue"
        />
        <TaskSection
          empty="Your inbox is clear."
          onComplete={onComplete}
          onDelete={onDelete}
          onEdit={edit}
          onRetrySync={onRetrySync}
          tasks={tasks.inbox}
          title="Inbox"
        />
        <TaskSection
          empty="No anytime tasks for this day."
          onComplete={onComplete}
          onDelete={onDelete}
          onEdit={edit}
          onRetrySync={onRetrySync}
          tasks={tasks.anytime}
          title="Anytime"
        />
        <TaskSection
          empty="No time blocks scheduled."
          onComplete={onComplete}
          onDelete={onDelete}
          onEdit={edit}
          onRetrySync={onRetrySync}
          tasks={tasks.timed}
          timed
          title="Timeline"
        />

        <section className="panel completed-section">
          <button className="completed-toggle" onClick={() => setCompletedOpen((open) => !open)} type="button">
            <span><Check size={17} /> Completed</span>
            <strong>{tasks.completed.length}</strong>
          </button>
          {completedOpen && (
            <div className="task-list">
              {tasks.completed.map((task) => (
                <TaskRow
                  key={task.id}
                  onDelete={onDelete}
                  onEdit={edit}
                  onReopen={onReopen}
                  onRetrySync={onRetrySync}
                  task={task}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  )
}

function CalendarConnection({ googleStatus, onConnect, onDisconnect }) {
  return (
    <aside className="panel calendar-connection">
      <div className="calendar-icon"><CalendarCheck size={21} /></div>
      <div>
        <span className="eyebrow">Google Calendar</span>
        <strong>{googleStatus.connected ? 'Connected' : googleStatus.configured ? 'Ready to connect' : 'Setup required'}</strong>
        <p>
          {googleStatus.connected
            ? 'Selected time blocks publish to your Goal OS calendar.'
            : googleStatus.configured
              ? 'Connect once to publish selected time blocks.'
              : 'Add the Google OAuth values to the server environment.'}
        </p>
      </div>
      {googleStatus.connected
        ? <button className="danger-outline" onClick={onDisconnect} type="button"><Unplug size={15} /> Disconnect</button>
        : <button className="wide-secondary" disabled={!googleStatus.configured} onClick={onConnect} type="button"><CalendarPlus size={15} /> Connect</button>}
    </aside>
  )
}

function TaskSection({ className = '', empty, onComplete, onDelete, onEdit, onRetrySync, tasks, timed = false, title }) {
  return (
    <section className={`panel task-section ${className}`}>
      <div className="section-heading"><h2>{title}</h2><span>{tasks.length}</span></div>
      <div className="task-list">
        {tasks.length === 0 && <p className="empty">{empty}</p>}
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            onComplete={onComplete}
            onDelete={onDelete}
            onEdit={onEdit}
            onRetrySync={onRetrySync}
            task={task}
            timed={timed}
          />
        ))}
      </div>
    </section>
  )
}

function TaskRow({ onComplete, onDelete, onEdit, onReopen, onRetrySync, task, timed }) {
  return (
    <article className={`schedule-task priority-${task.priority} ${task.status === 'completed' ? 'completed' : ''}`}>
      {task.status === 'completed'
        ? <button aria-label={`Reopen ${task.title}`} className="task-check done" onClick={() => onReopen(task.id)} type="button"><Check size={15} /></button>
        : <button aria-label={`Complete ${task.title}`} className="task-check" onClick={() => onComplete(task.id)} type="button"><Circle size={15} /></button>}
      {timed && <time><Clock3 size={13} /> {formatTime(task.startTime)}</time>}
      <div className="task-copy">
        <strong>{task.title}</strong>
        <span>{task.area} · {task.priority}{task.scheduledOn && !timed ? ` · ${task.scheduledOn}` : ''}</span>
        {task.notes && <small>{task.notes}</small>}
        {task.hasOverlap && <em>Overlaps another time block</em>}
      </div>
      <SyncBadge onRetry={() => onRetrySync(task.id)} task={task} />
      <div className="task-actions">
        <button aria-label={`Edit ${task.title}`} onClick={() => onEdit(task)} type="button"><Pencil size={14} /></button>
        <button aria-label={`Delete ${task.title}`} onClick={() => onDelete(task.id)} type="button"><Trash2 size={14} /></button>
      </div>
    </article>
  )
}

function SyncBadge({ onRetry, task }) {
  if (!task.calendarEnabled && !task.calendarEventId) return null
  if (task.syncStatus === 'failed') {
    return <button className="sync-badge failed" onClick={onRetry} title={task.syncError} type="button"><RefreshCcw size={12} /> Retry</button>
  }
  return <span className={`sync-badge ${task.syncStatus}`}>{task.syncStatus}</span>
}

function formatTime(time) {
  const [hour, minute] = time.split(':').map(Number)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2026, 0, 1, hour, minute))
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
