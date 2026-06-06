import { useCallback, useEffect, useState } from 'react'
import { api, money } from '../../api/client'
import BudgetCharts from './BudgetCharts'
import BudgetInsights from './BudgetInsights'
import Sparkline from './Sparkline'
import TransactionForm from './TransactionForm'
import TransactionHistory from './TransactionHistory'

const emptyTransactions = { entries: [], pagination: { page: 1, totalPages: 1, totalEntries: 0 } }

export default function BudgetView({ initialSummary, onFinanceChanged }) {
  const [summary, setSummary] = useState(initialSummary)
  const [analytics, setAnalytics] = useState(null)
  const [transactions, setTransactions] = useState(emptyTransactions)
  const [filters, setFilters] = useState({ filter: 'all', startDate: '', endDate: '', page: 1 })
  const [period, setPeriod] = useState('month')
  const [mode, setMode] = useState('current')
  const [selected, setSelected] = useState(new Set())
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') query.set(key, value)
    })
    const [nextSummary, nextAnalytics, nextTransactions] = await Promise.all([
      api(`/budget/summary?period=${period}&projected=${mode === 'projected'}`),
      api(`/budget/analytics?period=${period}`),
      api(`/transactions?${query}`),
    ])
    setSummary(nextSummary)
    setAnalytics(nextAnalytics)
    setTransactions(nextTransactions)
    onFinanceChanged(nextSummary)
  }, [filters, mode, onFinanceChanged, period])

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') query.set(key, value)
    })
    Promise.all([
      api(`/budget/summary?period=${period}&projected=${mode === 'projected'}`, { signal: controller.signal }),
      api(`/budget/analytics?period=${period}`, { signal: controller.signal }),
      api(`/transactions?${query}`, { signal: controller.signal }),
    ])
      .then(([nextSummary, nextAnalytics, nextTransactions]) => {
        setSummary(nextSummary)
        setAnalytics(nextAnalytics)
        setTransactions(nextTransactions)
        onFinanceChanged(nextSummary)
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })
    return () => controller.abort()
  }, [filters, mode, onFinanceChanged, period])

  async function createTransaction(payload) {
    await api('/transactions', { method: 'POST', body: payload })
    await load()
  }

  async function bulk(action, extra = {}) {
    setError('')
    try {
      await api('/transactions/bulk', {
        method: 'POST',
        body: { ids: [...selected], action, ...extra },
      })
      setSelected(new Set())
      await load()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function resetBudget() {
    if (!window.confirm('Clear every balance and transaction?')) return
    await api('/budget/reset', { method: 'POST' })
    setSelected(new Set())
    await load()
  }

  function changeFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value, page: 1 }))
    setSelected(new Set())
  }

  const cards = [
    ['Cash', summary.balances.cash, 'cash'],
    ['Bank', summary.balances.bank, 'bank'],
    ['Savings', summary.balances.savings, 'savings'],
    ['Total spent', summary.spent, 'spent'],
    ['To pay', summary.pending, 'pending'],
    ['Current money', summary.currentMoney, 'currentMoney'],
    ['Total tracked', summary.totalTracked, 'totalTracked'],
  ]

  return (
    <div className="budget-view">
      <header className="budget-hero">
        <div><span>Safe to spend</span><strong>{money.format(summary.safeToSpend / 100)}</strong><p>Cash and bank after planned payments.</p></div>
        <div className="summary-strip">
          {cards.map(([label, value, dataKey]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{money.format(value / 100)}</strong>
              {analytics?.sparklines && <Sparkline data={analytics.sparklines} dataKey={dataKey} />}
            </article>
          ))}
        </div>
      </header>

      <div className="analysis-toolbar">
        <h1>Money plan</h1>
        <div className="toolbar-actions">
          <div className="segmented">
            {[['week', 'Week'], ['month', 'Month'], ['lastmonth', 'Last month'], ['all', 'All time']].map(([value, label]) => (
              <button className={period === value ? 'active' : ''} key={value} onClick={() => setPeriod(value)} type="button">{label}</button>
            ))}
          </div>
          <button className="danger-outline" onClick={resetBudget} type="button">Reset budget</button>
        </div>
      </div>
      {analytics && <BudgetCharts analytics={analytics} mode={mode} onModeChange={setMode} />}
      {analytics && <BudgetInsights analytics={analytics} />}
      <TransactionForm onCreate={createTransaction} />
      {error && <p className="form-error floating-error">{error}</p>}
      <TransactionHistory
        filters={filters}
        onBulk={bulk}
        onFilterChange={changeFilter}
        onPage={(page) => setFilters({ ...filters, page })}
        onSelect={(id, checked) => setSelected((current) => {
          const next = new Set(current)
          if (checked) next.add(id)
          else next.delete(id)
          return next
        })}
        selected={selected}
        transactions={transactions}
      />
    </div>
  )
}
