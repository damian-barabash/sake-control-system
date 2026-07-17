import { useEffect, useId, useRef, useState } from 'react'

/* Lightweight SVG charts for the panel dashboard — DWISON-style gradients,
   draw-in animations, no chart library. */

/* Animated count-up for KPI values (respects reduced motion). */
export function useCountUp(target, ms = 900) {
  const [val, setVal] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const to = Number(target) || 0
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVal(to)
      return
    }
    const from = prev.current
    prev.current = to
    if (from === to) {
      setVal(to)
      return
    }
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms)
      const e = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setVal(Math.round(from + (to - from) * e))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return val
}

/* Donut chart with animated draw-in.
   segments: [{ value, color }]; centerTitle/centerSub render in the middle. */
export function Donut({ segments = [], size = 168, thickness = 17, centerTitle, centerSub }) {
  const uid = useId().replace(/:/g, '')
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0))
  const r = (size - thickness) / 2
  const C = 2 * Math.PI * r
  const gap = segments.filter((s) => s.value > 0).length > 1 ? C * 0.012 : 0

  let acc = 0
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const frac = s.value / total
      const len = Math.max(0, C * frac - gap)
      const off = -acc * C
      acc += frac
      return { ...s, len, off, key: i }
    })

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          {arcs.map((a) => (
            <linearGradient key={a.key} id={`dg-${uid}-${a.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={a.color} stopOpacity="1" />
              <stop offset="100%" stopColor={a.color} stopOpacity="0.55" />
            </linearGradient>
          ))}
        </defs>
        {/* track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-surface2))" strokeWidth={thickness} />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#dg-${uid}-${a.key})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${drawn ? a.len : 0} ${C}`}
            strokeDashoffset={a.off}
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[1.55rem] font-semibold leading-none tracking-tight text-ink">{centerTitle}</span>
        {centerSub && <span className="mt-1.5 text-[11px] text-faint">{centerSub}</span>}
      </div>
    </div>
  )
}

/* Smooth area chart with gradient fill and animated left→right reveal.
   points: number[] (already ordered oldest→newest). */
export function AreaChart({ points = [], height = 150, color = '#34C77F' }) {
  const uid = useId().replace(/:/g, '')
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const W = 600
  const H = height
  const pad = 6
  const n = points.length
  if (n < 2) return <div style={{ height }} className="flex items-center justify-center text-[12px] text-faint">—</div>

  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const x = (i) => pad + (i / (n - 1)) * (W - pad * 2)
  const y = (v) => H - pad - ((v - min) / span) * (H - pad * 2.6)

  // Catmull-Rom → cubic bezier for a smooth line
  let d = `M${x(0).toFixed(1)},${y(points[0]).toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(n - 1, i + 2)]
    const c1x = x(i) + (x(i + 1) - x(Math.max(0, i - 1))) / 6
    const c1y = y(p1) + (y(p2) - y(p0)) / 6
    const c2x = x(i + 1) - (x(Math.min(n - 1, i + 2)) - x(i)) / 6
    const c2y = y(p2) - (y(p3) - y(p1)) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x(i + 1).toFixed(1)},${y(p2).toFixed(1)}`
  }
  const area = `${d} L${(W - pad).toFixed(1)},${H} L${pad},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`af-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`al-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
        <clipPath id={`ac-${uid}`}>
          <rect x="0" y="0" height={H} width={drawn ? W : 0} style={{ transition: 'width 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }} />
        </clipPath>
      </defs>
      <g clipPath={`url(#ac-${uid})`}>
        <path d={area} fill={`url(#af-${uid})`} />
        <path d={d} fill="none" stroke={`url(#al-${uid})`} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      </g>
      {/* live tip dot */}
      <circle cx={x(n - 1)} cy={y(points[n - 1])} r="3.4" fill={color} opacity={drawn ? 1 : 0} style={{ transition: 'opacity 0.4s 0.9s' }} />
      <circle cx={x(n - 1)} cy={y(points[n - 1])} r="7" fill={color} opacity={drawn ? 0.22 : 0} className="pulse" />
    </svg>
  )
}
