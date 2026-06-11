import { Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import DrumPicker from './DrumPicker'

const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const PERIODS = ['AM', 'PM']

function buildISO(hour, minute, period, yesterday = false) {
  let h = Number(hour)
  if (period === 'AM' && h === 12) h = 0
  if (period === 'PM' && h !== 12) h += 12
  const d = new Date()
  if (yesterday) d.setDate(d.getDate() - 1)
  d.setHours(h, Number(minute), 0, 0)
  return d.toISOString()
}

function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function barColor(durationMinutes) {
  if (durationMinutes >= 480) return 'var(--primary)'
  if (durationMinutes >= 360) return 'var(--sleep-amber)'
  return 'var(--danger)'
}

function SleepChart({ last7 }) {
  const W = 600
  const H = 220
  const PL = 34
  const PB = 28
  const PT = 24
  const chartW = W - PL - 8
  const chartH = H - PB - PT
  const MAX_MIN = 10 * 60
  const slotW = chartW / 7
  const barW = Math.floor(slotW * 0.54)

  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), log: last7.find((l) => l.recordedOn === key) })
  }

  const yFor = (mins) => PT + chartH - (mins / MAX_MIN) * chartH

  return (
    <svg className="sleep-chart-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {[240, 360, 480, 600].map((mins) => {
        const y = yFor(mins)
        return (
          <g key={mins}>
            <line x1={PL} x2={W - 8} y1={y} y2={y}
              stroke={mins === 480 ? 'rgba(196,154,42,0.35)' : 'var(--line)'}
              strokeDasharray={mins === 480 ? '5 4' : '2 4'}
              strokeWidth={mins === 480 ? 1.5 : 1}
            />
            <text x={PL - 4} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize={10}>{mins / 60}h</text>
          </g>
        )
      })}
      <text x={W - 7} y={yFor(480) - 5} textAnchor="end" fill="var(--sleep-amber)" fontSize={9} fontWeight="600">8h goal</text>

      {days.map(({ label, log }, i) => {
        const cx = PL + i * slotW + slotW / 2
        const x = cx - barW / 2
        if (!log) {
          return (
            <g key={label}>
              <rect x={x} y={PT} width={barW} height={chartH} rx={4} fill="none" stroke="var(--line)" strokeDasharray="3 3" />
              <text x={cx} y={H - 8} textAnchor="middle" fill="var(--muted)" fontSize={10}>{label}</text>
            </g>
          )
        }
        const barH = Math.max(6, (log.durationMinutes / MAX_MIN) * chartH)
        const barY = PT + chartH - barH
        const color = barColor(log.durationMinutes)
        return (
          <g key={label}>
            <rect x={x} y={barY} width={barW} height={barH} rx={4} fill={color} opacity={0.9} />
            <text x={cx} y={barY - 5} textAnchor="middle" fill={color} fontSize={10} fontWeight="600">
              {(log.durationMinutes / 60).toFixed(1)}h
            </text>
            <text x={cx} y={H - 8} textAnchor="middle" fill="var(--muted)" fontSize={10}>{label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function SleepView({ logs, analytics, onLog, onDelete }) {
  const [formKey, setFormKey] = useState(0)
  const [logType, setLogType] = useState('night') // 'night' | 'nap'
  const bedRef = useRef({ hour: '11', minute: '00', period: 'PM' })
  const wakeRef = useRef({ hour: '7', minute: '00', period: 'AM' })
  const napStartRef = useRef({ hour: '2', minute: '00', period: 'PM' })
  const napEndRef = useRef({ hour: '3', minute: '00', period: 'PM' })
  const [quality, setQuality] = useState(3)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (logType === 'nap') {
        const { hour: sh, minute: sm, period: sp } = napStartRef.current
        const { hour: eh, minute: em, period: ep } = napEndRef.current
        await onLog({
          type: 'nap',
          sleptAt: buildISO(sh, sm, sp, false),
          wokeAt: buildISO(eh, em, ep, false),
          quality,
          notes,
        })
      } else {
        const { hour: bh, minute: bm, period: bp } = bedRef.current
        const { hour: wh, minute: wm, period: wp } = wakeRef.current
        await onLog({
          type: 'night',
          sleptAt: buildISO(bh, bm, bp, bp === 'PM'),
          wokeAt: buildISO(wh, wm, wp, false),
          quality,
          notes,
        })
      }
      setFormKey((k) => k + 1)
      setQuality(3)
      setNotes('')
    } catch (err) {
      setError(err.details ? Object.values(err.details)[0] : err.message)
    } finally {
      setLoading(false)
    }
  }

  const avgH = analytics.avgMinutes ? fmtDuration(analytics.avgMinutes) : '—'
  const debtH = analytics.sleepDebtMinutes > 0 ? fmtDuration(analytics.sleepDebtMinutes) : null

  return (
    <section className="sleep-view">
      <div className="sleep-header">
        <h1>Sleep</h1>
        <p>Track your rest, build your recovery.</p>
      </div>

      <form className="sleep-log-form" onSubmit={handleSubmit}>
        <div className="sleep-type-toggle">
          <button type="button" className={`sleep-type-btn${logType === 'night' ? ' active' : ''}`} onClick={() => setLogType('night')}>Night</button>
          <button type="button" className={`sleep-type-btn${logType === 'nap' ? ' active' : ''}`} onClick={() => setLogType('nap')}>Nap</button>
        </div>

        {logType === 'night' ? (
          <div className="sleep-pickers-row">
            <div className="sleep-picker-group">
              <span className="sleep-picker-label">Bedtime</span>
              <div className="sleep-drums">
                <DrumPicker key={`bh-${formKey}`} items={HOURS} defaultValue="11" width={56} onChange={(v) => { bedRef.current.hour = v }} />
                <span className="drum-colon">:</span>
                <DrumPicker key={`bm-${formKey}`} items={MINUTES} defaultValue="00" width={56} onChange={(v) => { bedRef.current.minute = v }} />
                <DrumPicker key={`bp-${formKey}`} items={PERIODS} defaultValue="PM" width={54} onChange={(v) => { bedRef.current.period = v }} />
              </div>
            </div>
            <div className="sleep-picker-sep">→</div>
            <div className="sleep-picker-group">
              <span className="sleep-picker-label">Wake up</span>
              <div className="sleep-drums">
                <DrumPicker key={`wh-${formKey}`} items={HOURS} defaultValue="7" width={56} onChange={(v) => { wakeRef.current.hour = v }} />
                <span className="drum-colon">:</span>
                <DrumPicker key={`wm-${formKey}`} items={MINUTES} defaultValue="00" width={56} onChange={(v) => { wakeRef.current.minute = v }} />
                <DrumPicker key={`wp-${formKey}`} items={PERIODS} defaultValue="AM" width={54} onChange={(v) => { wakeRef.current.period = v }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="sleep-pickers-row">
            <div className="sleep-picker-group">
              <span className="sleep-picker-label">Fell asleep</span>
              <div className="sleep-drums">
                <DrumPicker key={`nsh-${formKey}`} items={HOURS} defaultValue="2" width={56} onChange={(v) => { napStartRef.current.hour = v }} />
                <span className="drum-colon">:</span>
                <DrumPicker key={`nsm-${formKey}`} items={MINUTES} defaultValue="00" width={56} onChange={(v) => { napStartRef.current.minute = v }} />
                <DrumPicker key={`nsp-${formKey}`} items={PERIODS} defaultValue="PM" width={54} onChange={(v) => { napStartRef.current.period = v }} />
              </div>
            </div>
            <div className="sleep-picker-sep">→</div>
            <div className="sleep-picker-group">
              <span className="sleep-picker-label">Woke up</span>
              <div className="sleep-drums">
                <DrumPicker key={`neh-${formKey}`} items={HOURS} defaultValue="3" width={56} onChange={(v) => { napEndRef.current.hour = v }} />
                <span className="drum-colon">:</span>
                <DrumPicker key={`nem-${formKey}`} items={MINUTES} defaultValue="00" width={56} onChange={(v) => { napEndRef.current.minute = v }} />
                <DrumPicker key={`nep-${formKey}`} items={PERIODS} defaultValue="PM" width={54} onChange={(v) => { napEndRef.current.period = v }} />
              </div>
            </div>
          </div>
        )}

        <div className="sleep-form-row">
          <div className="star-row" role="group" aria-label="Sleep quality">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={`star-btn${n <= quality ? ' active' : ''}`}
                onClick={() => setQuality(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
                ★
              </button>
            ))}
          </div>
          <input className="sleep-notes-input" type="text" placeholder="Notes (optional)"
            value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          <button className="sleep-log-btn" disabled={loading} type="submit">Log {logType}</button>
        </div>
        {error && <p className="form-error" style={{ marginTop: 6 }}>{error}</p>}
      </form>

      <div className="sleep-stats-row">
        <div className="sleep-stat">
          <strong>{avgH}</strong>
          <span>Avg this week</span>
        </div>
        <div className="sleep-stat-divider" />
        <div className="sleep-stat">
          <strong className={analytics.sleepDebtMinutes > 0 ? 'debt' : 'surplus'}>
            {debtH ? `−${debtH}` : 'On track'}
          </strong>
          <span>Sleep debt</span>
        </div>
        <div className="sleep-stat-divider" />
        <div className="sleep-stat">
          <strong>{analytics.streak}<em>d</em></strong>
          <span>Streak</span>
        </div>
      </div>

      <div className="sleep-chart-section">
        <div className="sleep-chart-header">
          <h2>Last 7 nights</h2>
          <div className="sleep-chart-legend">
            <span className="legend-dot green" />8h+
            <span className="legend-dot amber" />6–8h
            <span className="legend-dot red" />&lt;6h
          </div>
        </div>
        <SleepChart last7={analytics.last7} />
      </div>

      <div className="sleep-history">
        <h2>History</h2>
        {logs.length === 0 && <p className="empty" style={{ marginTop: 10 }}>No nights logged yet.</p>}
        {logs.map((log) => (
          <article className="sleep-history-row" key={log.id}>
            <div className="sleep-history-date">
              <strong>
                {fmtDate(log.sleptAt)}
                {log.type === 'nap' && <span className="nap-badge">nap</span>}
              </strong>
              <small>{fmtTime(log.sleptAt)} → {fmtTime(log.wokeAt)}</small>
            </div>
            <div className="sleep-history-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= log.quality ? 'star-filled' : 'star-empty'}>★</span>
              ))}
            </div>
            <strong className="sleep-history-dur">{fmtDuration(log.durationMinutes)}</strong>
            {log.notes && <span className="sleep-history-notes">{log.notes}</span>}
            <button className="danger-icon" onClick={() => onDelete(log.id)} title="Delete" type="button">
              <Trash2 size={14} />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
