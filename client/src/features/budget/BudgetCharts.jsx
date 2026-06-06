import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { money } from '../../api/client'

const colors = ['#0b624b', '#d7a63d', '#6655c8']

export default function BudgetCharts({ analytics, mode, onModeChange }) {
  const split = mode === 'projected' ? analytics.projected : analytics.current
  const pieData = [
    { name: 'Needs', value: split.needs },
    { name: 'Wants', value: split.wants },
    { name: 'Debt/Saving', value: split.debtSaving },
  ]

  return (
    <div className="analysis-grid">
      <article className="panel chart-panel">
        <div className="section-heading"><h2>Spending trend</h2><span>{periodLabel(analytics.period)}</span></div>
        <div className="chart-area">
          {analytics.trend.length === 0
            ? <p className="empty centered">No paid spending in this period.</p>
            : (
              <ResponsiveContainer height={250} width="100%">
                <AreaChart data={analytics.trend}>
                  <defs>
                    <linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#0b624b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0b624b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e5e7e4" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickFormatter={(value) => `₱${Math.round(value / 100)}`} tickLine={false} width={55} />
                  <Tooltip formatter={(value) => money.format(value / 100)} />
                  <Area
                    dataKey="amountCentavos"
                    dot={{ fill: '#0b624b', r: 4 }}
                    fill="url(#spendFill)"
                    isAnimationActive={false}
                    stroke="#0b624b"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>
      </article>

      <article className="panel chart-panel">
        <div className="section-heading">
          <div><h2>50/30/20 split</h2><span>{mode === 'projected' ? 'Paid + To Pay' : 'Paid only'}</span></div>
          <div className="segmented">
            <button className={mode === 'current' ? 'active' : ''} onClick={() => onModeChange('current')} type="button">Current</button>
            <button className={mode === 'projected' ? 'active' : ''} onClick={() => onModeChange('projected')} type="button">Projected</button>
          </div>
        </div>
        <div className="donut-layout">
          <ResponsiveContainer height={220} width="55%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                innerRadius={58}
                isAnimationActive={false}
                outerRadius={88}
                paddingAngle={2}
              >
                {pieData.map((entry, index) => <Cell fill={colors[index]} key={entry.name} />)}
              </Pie>
              <Tooltip formatter={(value) => money.format(value / 100)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {pieData.map((item, index) => (
              <div key={item.name}>
                <i style={{ background: colors[index] }} />
                <span>{item.name}</span>
                <strong>{money.format(item.value / 100)}</strong>
                <small>{split.total ? Math.round((item.value / split.total) * 100) : 0}%</small>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  )
}

function periodLabel(period) {
  return {
    week: 'This week',
    month: 'This month',
    lastmonth: 'Last month',
    all: 'All time',
  }[period] || 'This month'
}
