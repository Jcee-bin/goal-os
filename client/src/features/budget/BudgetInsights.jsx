import { money } from '../../api/client'

const categoryLabels = {
  needs: 'Needs',
  wants: 'Wants',
  debtSaving: 'Debt / saving',
}

const categoryColors = {
  needs: '#2e8c62',
  wants: '#c49020',
  debtSaving: '#8170d0',
}

export default function BudgetInsights({ analytics }) {
  const pending = Object.fromEntries(
    Object.keys(categoryLabels).map((key) => [
      key,
      Math.max(0, analytics.projected[key] - analytics.current[key]),
    ]),
  )
  const maximum = Math.max(1, ...Object.values(pending))

  return (
    <div className="budget-insights">
      <article className="panel">
        <div className="section-heading">
          <div><h2>To pay shape</h2><span>Planned expenses by category</span></div>
        </div>
        <div className="pending-bars">
          {Object.entries(pending).map(([key, value]) => (
            <div key={key}>
              <span>{categoryLabels[key]}</span>
              <div className="track"><i style={{ width: `${(value / maximum) * 100}%`, background: categoryColors[key] }} /></div>
              <strong>{money.format(value / 100)}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="section-heading">
          <div><h2>Biggest charges</h2><span>Largest paid or planned expenses</span></div>
        </div>
        {analytics.largestCharges.length === 0
          ? <p className="empty">No expenses in this period.</p>
          : (
            <ol className="charge-list">
              {analytics.largestCharges.map((charge) => (
                <li key={charge.id}>
                  <div><strong>{charge.note}</strong><span>{charge.category} · {charge.status}</span></div>
                  <strong>{money.format(charge.amountCentavos / 100)}</strong>
                </li>
              ))}
            </ol>
          )}
      </article>
    </div>
  )
}
