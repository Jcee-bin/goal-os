import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { money } from '../../api/client'

export default function AnalyticsView({ dashboard, financeAnalytics }) {
  const habitData = dashboard.analytics.weeklyTrend.map((item) => ({
    ...item,
    label: item.date.slice(5),
  }))
  const split = financeAnalytics.current

  return (
    <div className="analytics-view">
      <div className="page-heading"><span className="eyebrow">Stats</span><h1>Patterns, not noise.</h1><p>Use this page to see whether your systems are actually moving.</p></div>
      <section className="stats four">
        <article><span>Productive today</span><strong>{dashboard.analytics.productivity}%</strong></article>
        <article><span>Total XP</span><strong>{dashboard.analytics.totalXp}</strong></article>
        <article><span>Best streak</span><strong>{dashboard.analytics.bestStreak} days</strong></article>
        <article><span>Current spend</span><strong>{money.format(split.total / 100)}</strong></article>
      </section>
      <div className="analysis-grid">
        <section className="panel chart-panel">
          <div className="section-heading"><h2>Habit votes</h2><span>Last seven days</span></div>
          <ResponsiveContainer height={280} width="100%">
            <BarChart data={habitData}>
              <CartesianGrid stroke="#2d3630" vertical={false} />
              <XAxis axisLine={false} dataKey="label" fontSize={11} tick={{ fill: '#748a78' }} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} fontSize={11} tick={{ fill: '#748a78' }} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1d2320', border: '1px solid #2d3630', borderRadius: '5px', color: '#e4ebe5', fontSize: '0.8rem' }} cursor={{ fill: 'rgba(46, 140, 98, 0.07)' }} />
              <Bar dataKey="count" fill="#2e8c62" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="panel analytics-notes">
          <div className="section-heading"><h2>System readout</h2><span>Current</span></div>
          <dl>
            <div><dt>Habit votes today</dt><dd>{dashboard.analytics.completedVotes}/{dashboard.analytics.targetVotes}</dd></div>
            <div><dt>Needs</dt><dd>{split.needsPercent}%</dd></div>
            <div><dt>Wants</dt><dd>{split.wantsPercent}%</dd></div>
            <div><dt>Debt/Saving</dt><dd>{split.debtSavingPercent}%</dd></div>
          </dl>
          <p>{dashboard.analytics.productivity >= 70 ? 'Your daily system is holding. Protect the cues that made today work.' : 'Reduce friction: choose one small habit to make obvious before adding more.'}</p>
        </section>
      </div>
    </div>
  )
}
