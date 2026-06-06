export default function Sparkline({ data, dataKey }) {
  const values = data.map((point) => point[dataKey] ?? 0)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const range = maximum - minimum || 1
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100
      const y = 27 - ((value - minimum) / range) * 22
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg aria-hidden="true" className="summary-sparkline" preserveAspectRatio="none" viewBox="0 0 100 32">
      <polyline fill="none" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
