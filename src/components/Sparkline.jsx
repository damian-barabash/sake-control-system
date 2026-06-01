// Tiny latency sparkline. values: array of { latency_ms, status } oldest→newest.
export function Sparkline({ points = [], width = 120, height = 28 }) {
  const vals = points.map((p) => (p.status === 'down' ? null : p.latency_ms ?? null))
  const nums = vals.filter((v) => v != null)
  if (nums.length < 2) {
    return <div style={{ width, height }} className="flex items-center text-faint text-[10px]">—</div>
  }
  const max = Math.max(...nums)
  const min = Math.min(...nums)
  const span = max - min || 1
  const stepX = width / (vals.length - 1)
  const y = (v) => height - 2 - ((v - min) / span) * (height - 4)

  let d = ''
  vals.forEach((v, i) => {
    if (v == null) return
    const cmd = d === '' ? 'M' : 'L'
    d += `${cmd}${(i * stepX).toFixed(1)},${y(v).toFixed(1)} `
  })

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke="#34C77F" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) =>
        p.status === 'down' ? (
          <circle key={i} cx={i * stepX} cy={height - 2} r="1.6" fill="#E2564A" />
        ) : null,
      )}
    </svg>
  )
}
