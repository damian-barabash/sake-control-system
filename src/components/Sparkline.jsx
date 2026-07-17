import { useId } from 'react'

// Tiny latency sparkline with a soft gradient area (DWISON-style).
// values: array of { latency_ms, status } oldest→newest.
export function Sparkline({ points = [], width = 120, height = 28 }) {
  const uid = useId().replace(/:/g, '')
  const vals = points.map((p) => (p.status === 'down' ? null : p.latency_ms ?? null))
  const nums = vals.filter((v) => v != null)
  if (nums.length < 2) {
    return <div style={{ width, height }} className="flex items-center text-faint text-[10px]">—</div>
  }
  const max = Math.max(...nums)
  const min = Math.min(...nums)
  const span = max - min || 1
  const stepX = width / (vals.length - 1)
  const y = (v) => height - 3 - ((v - min) / span) * (height - 7)

  let d = ''
  let firstX = null
  let lastX = null
  vals.forEach((v, i) => {
    if (v == null) return
    const px = i * stepX
    if (firstX == null) firstX = px
    lastX = px
    const cmd = d === '' ? 'M' : 'L'
    d += `${cmd}${px.toFixed(1)},${y(v).toFixed(1)} `
  })
  const area = `${d} L${lastX.toFixed(1)},${height} L${firstX.toFixed(1)},${height} Z`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sp-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34C77F" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#34C77F" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${uid})`} />
      <path d={d} fill="none" stroke="#34C77F" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) =>
        p.status === 'down' ? (
          <circle key={i} cx={i * stepX} cy={height - 2} r="1.6" fill="#E2564A" />
        ) : null,
      )}
    </svg>
  )
}
