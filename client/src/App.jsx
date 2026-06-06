import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import './App.css'
import { api } from './api/client'
import AppShell from './components/AppShell'
import DashboardView from './features/dashboard/DashboardView'
import GoalsView from './features/goals/GoalsView'
import HabitsView from './features/habits/HabitsView'
import IdentityView from './features/identity/IdentityView'
import LegacyImport from './features/import/LegacyImport'
import TodayView from './features/tasks/TodayView'

const AnalyticsView = lazy(() => import('./features/analytics/AnalyticsView'))
const BudgetView = lazy(() => import('./features/budget/BudgetView'))

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [dashboard, setDashboard] = useState(null)
  const [finance, setFinance] = useState(null)
  const [financeAnalytics, setFinanceAnalytics] = useState(null)
  const [error, setError] = useState('')
  const [taskDate, setTaskDate] = useState(todayKey)
  const [tasks, setTasks] = useState(null)
  const [todayTasks, setTodayTasks] = useState(null)
  const [googleStatus, setGoogleStatus] = useState(null)

  const loadEverything = useCallback(async () => {
    const currentDate = todayKey()
    const [nextDashboard, nextFinance, nextFinanceAnalytics, nextTasks, nextTodayTasks, nextGoogleStatus] = await Promise.all([
      api('/dashboard'),
      api('/budget/summary'),
      api('/budget/analytics?period=month'),
      api(`/tasks?date=${taskDate}`),
      api(`/tasks?date=${currentDate}`),
      api('/integrations/google/status'),
    ])
    setDashboard(nextDashboard)
    setFinance(nextFinance)
    setFinanceAnalytics(nextFinanceAnalytics)
    setTasks(nextTasks)
    setTodayTasks(nextTodayTasks)
    setGoogleStatus(nextGoogleStatus)
  }, [taskDate])

  useEffect(() => {
    const controller = new AbortController()
    const currentDate = todayKey()
    Promise.all([
      api('/dashboard', { signal: controller.signal }),
      api('/budget/summary', { signal: controller.signal }),
      api('/budget/analytics?period=month', { signal: controller.signal }),
      api(`/tasks?date=${taskDate}`, { signal: controller.signal }),
      api(`/tasks?date=${currentDate}`, { signal: controller.signal }),
      api('/integrations/google/status', { signal: controller.signal }),
    ])
      .then(([nextDashboard, nextFinance, nextFinanceAnalytics, nextTasks, nextTodayTasks, nextGoogleStatus]) => {
        setDashboard(nextDashboard)
        setFinance(nextFinance)
        setFinanceAnalytics(nextFinanceAnalytics)
        setTasks(nextTasks)
        setTodayTasks(nextTodayTasks)
        setGoogleStatus(nextGoogleStatus)
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })
    return () => controller.abort()
  }, [taskDate])

  const refreshActivity = useCallback(async () => {
    setDashboard(await api('/dashboard'))
  }, [])

  async function completeHabit(id) {
    try {
      await api(`/habits/${id}/completions`, { method: 'POST' })
      await refreshActivity()
    } catch (requestError) {
      if (requestError.status !== 409) setError(requestError.message)
    }
  }

  async function createHabit(payload) {
    await api('/habits', { method: 'POST', body: payload })
    await refreshActivity()
  }

  async function deleteHabit(id) {
    if (!window.confirm('Delete this habit and its completion history?')) return
    await api(`/habits/${id}`, { method: 'DELETE' })
    await refreshActivity()
  }

  async function createGoal(payload) {
    await api('/goals', { method: 'POST', body: payload })
    await refreshActivity()
  }

  async function progressGoal(id) {
    try {
      await api(`/goals/${id}/progress`, { method: 'POST', body: { amount: 1 } })
      await refreshActivity()
    } catch (requestError) {
      if (requestError.status !== 409) setError(requestError.message)
    }
  }

  async function deleteGoal(id) {
    if (!window.confirm('Delete this goal and its progress history?')) return
    await api(`/goals/${id}`, { method: 'DELETE' })
    await refreshActivity()
  }

  async function saveProfile(payload) {
    await api('/profile', { method: 'PATCH', body: payload })
    await refreshActivity()
  }

  async function resetLogs() {
    if (!window.confirm('Reset XP, completions, evidence, and goal progress? Your configured habits and goals stay.')) return
    setDashboard(await api('/reset-logs', { method: 'POST' }))
  }

  const updateFinance = useCallback((nextFinance) => setFinance(nextFinance), [])
  const refreshTasks = useCallback(async () => {
    const currentDate = todayKey()
    const [nextTasks, nextTodayTasks] = await Promise.all([
      api(`/tasks?date=${taskDate}`),
      api(`/tasks?date=${currentDate}`),
    ])
    setTasks(nextTasks)
    setTodayTasks(nextTodayTasks)
  }, [taskDate])

  async function createTask(payload) {
    await api('/tasks', { method: 'POST', body: payload })
    await refreshTasks()
  }

  async function updateTask(id, payload) {
    await api(`/tasks/${id}`, { method: 'PATCH', body: payload })
    await refreshTasks()
  }

  async function taskAction(id, action) {
    await api(`/tasks/${id}/${action}`, { method: 'POST' })
    await refreshTasks()
  }

  async function deleteTask(id) {
    if (!window.confirm('Delete this task?')) return
    await api(`/tasks/${id}`, { method: 'DELETE' })
    await refreshTasks()
  }

  async function connectGoogle() {
    const connection = await api('/integrations/google/connect')
    window.location.assign(connection.url)
  }

  async function disconnectGoogle() {
    if (!window.confirm('Disconnect Google Calendar? Existing events will stay in Google.')) return
    setGoogleStatus(await api('/integrations/google/disconnect', { method: 'POST' }))
    await refreshTasks()
  }

  if (error && !dashboard) {
    return (
      <main className="status-screen">
        <strong>Goal OS could not load.</strong>
        <span>{error}</span>
        <button onClick={() => window.location.reload()} type="button">Try again</button>
      </main>
    )
  }
  if (!dashboard || !finance || !financeAnalytics || !tasks || !todayTasks || !googleStatus) {
    return <main className="status-screen">Loading Goal OS...</main>
  }

  return (
    <AppShell
      activeView={activeView}
      onNavigate={setActiveView}
      onReset={resetLogs}
    >
      <LegacyImport onImported={loadEverything} />
      {error && <button className="error-banner" onClick={() => setError('')} type="button">{error} · dismiss</button>}
      {activeView === 'dashboard' && (
        <DashboardView
          dashboard={dashboard}
          finance={finance}
          tasks={todayTasks}
          onCompleteHabit={completeHabit}
          onNavigate={setActiveView}
          onProgressGoal={progressGoal}
        />
      )}
      {activeView === 'today' && (
        <TodayView
          date={taskDate}
          googleStatus={googleStatus}
          onComplete={(id) => taskAction(id, 'complete')}
          onConnect={connectGoogle}
          onCreate={createTask}
          onDateChange={setTaskDate}
          onDelete={deleteTask}
          onDisconnect={disconnectGoogle}
          onReopen={(id) => taskAction(id, 'reopen')}
          onRetrySync={(id) => taskAction(id, 'retry-sync')}
          onUpdate={updateTask}
          tasks={tasks}
        />
      )}
      {activeView === 'habits' && (
        <HabitsView
          habits={dashboard.habits}
          onComplete={completeHabit}
          onCreate={createHabit}
          onDelete={deleteHabit}
        />
      )}
      {activeView === 'goals' && (
        <GoalsView
          goals={dashboard.goals}
          onCreate={createGoal}
          onDelete={deleteGoal}
          onProgress={progressGoal}
        />
      )}
      {activeView === 'budget' && (
        <Suspense fallback={<section className="panel">Loading budget...</section>}>
          <BudgetView initialSummary={finance} onFinanceChanged={updateFinance} />
        </Suspense>
      )}
      {activeView === 'analytics' && (
        <Suspense fallback={<section className="panel">Loading analytics...</section>}>
          <AnalyticsView dashboard={dashboard} financeAnalytics={financeAnalytics} />
        </Suspense>
      )}
      {activeView === 'identity' && (
        <IdentityView profile={dashboard.profile} onSave={saveProfile} />
      )}
    </AppShell>
  )
}

export default App

function todayKey() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
