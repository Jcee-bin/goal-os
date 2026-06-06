import {
  BarChart3,
  CheckSquare,
  CircleUserRound,
  LayoutDashboard,
  ListChecks,
  RefreshCcw,
  WalletCards,
} from 'lucide-react'

const items = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['habits', 'Habits', CheckSquare],
  ['goals', 'Goals', ListChecks],
  ['budget', 'Budget', WalletCards],
  ['analytics', 'Analytics', BarChart3],
  ['identity', 'Identity', CircleUserRound],
]

export default function AppShell({ activeView, children, onNavigate, onReset }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">ID</span>
          <div>
            <strong>Goal OS</strong>
            <small>Personal operating system</small>
          </div>
        </div>

        <nav aria-label="Primary">
          {items.map(([id, label, Icon]) => (
            <button
              aria-label={label}
              className={activeView === id ? 'active' : ''}
              key={id}
              onClick={() => onNavigate(id)}
              type="button"
            >
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button aria-label="Reset logs" className="reset-link" onClick={onReset} type="button">
          <RefreshCcw aria-hidden="true" size={16} />
          Reset logs
        </button>
      </aside>

      <main className="content">{children}</main>
    </div>
  )
}
