import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import './App.css'
import { api } from './api/client'
import AppShell from './components/AppShell'
import DashboardView from './features/dashboard/DashboardView'
import GoalsView from './features/goals/GoalsView'
import HabitsView from './features/habits/HabitsView'
import IdentityView from './features/identity/IdentityView'
import LegacyImport from './features/import/LegacyImport'

const AnalyticsView = lazy(() => import('./features/analytics/AnalyticsView'))
const BudgetView = lazy(() => import('./features/budget/BudgetView'))

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [dashboard, setDashboard] = useState(null)
  const [finance, setFinance] = useState(null)
  const [financeAnalytics, setFinanceAnalytics] = useState(null)
  const [error, setError] = useState('')

  const loadEverything = useCallback(async () => {
    const [nextDashboard, nextFinance, nextFinanceAnalytics] = await Promise.all([
      api('/dashboard'),
      api('/budget/summary'),
      api('/budget/analytics?period=month'),
    ])
    setDashboard(nextDashboard)
    setFinance(nextFinance)
    setFinanceAnalytics(nextFinanceAnalytics)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api('/dashboard', { signal: controller.signal }),
      api('/budget/summary', { signal: controller.signal }),
      api('/budget/analytics?period=month', { signal: controller.signal }),
    ])
      .then(([nextDashboard, nextFinance, nextFinanceAnalytics]) => {
        setDashboard(nextDashboard)
        setFinance(nextFinance)
        setFinanceAnalytics(nextFinanceAnalytics)
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })
    return () => controller.abort()
  }, [])

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

  if (error && !dashboard) {
    return (
      <main className="status-screen">
        <strong>Goal OS could not load.</strong>
        <span>{error}</span>
        <button onClick={() => window.location.reload()} type="button">Try again</button>
      </main>
    )
  }
  if (!dashboard || !finance || !financeAnalytics) {
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
          onCompleteHabit={completeHabit}
          onNavigate={setActiveView}
          onProgressGoal={progressGoal}
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
