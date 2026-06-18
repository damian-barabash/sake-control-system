import { useEffect, useRef } from 'react'

// Living grid backdrop for the landing page.
//  • faint theme-aware grid lines (the "сетка")
//  • brand logos fade in/out at random grid cells — most are green (healthy),
//    some flash red (recoloured = an outage), echoing what SAKE actually does.
// Pure <canvas>, no Three.js — keeps the bundle light.

export default function GridBackground({ className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, dpr = 1
    const GRID = 78

    // faint brand-green mesh — reads on both light and dark themes
    const lineColor = 'rgb(52,199,127)'
    const gridAlpha = () =>
      document.documentElement.classList.contains('theme-light') ? 0.16 : 0.12

    // logo + a red-tinted copy (keeps the cloud shape, overlays red)
    const img = new Image()
    let green = null, red = null
    img.onload = () => {
      green = img
      const o = document.createElement('canvas')
      o.width = img.naturalWidth || 256
      o.height = img.naturalHeight || 256
      const oc = o.getContext('2d')
      oc.drawImage(img, 0, 0, o.width, o.height)
      oc.globalCompositeOperation = 'source-atop'
      oc.fillStyle = 'rgba(226,86,74,0.86)'
      oc.fillRect(0, 0, o.width, o.height)
      red = o
    }
    img.src = './logo.png'

    const sprites = []
    function spawn() {
      if (!green) return
      const cols = Math.max(1, Math.floor(w / GRID))
      const rows = Math.max(1, Math.floor(h / GRID))
      const ox = (w - cols * GRID) / 2
      const oy = (h - rows * GRID) / 2
      const cx = ox + (Math.floor(Math.random() * cols) + 0.5) * GRID
      const cy = oy + (Math.floor(Math.random() * rows) + 0.5) * GRID
      const isRed = Math.random() < 0.3
      sprites.push({
        cx, cy,
        size: GRID * (1.05 + Math.random() * 0.35),
        born: 0,
        life: 2400 + Math.random() * 1600,
        isRed,
        peak: isRed ? 0.55 : 0.48,
      })
      if (sprites.length > 16) sprites.shift()
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth || window.innerWidth
      h = canvas.clientHeight || window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf, last = performance.now(), spawnAcc = 0
    const interval = reduce ? 4000 : 1100
    function frame(now) {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(80, now - last)
      last = now
      ctx.clearRect(0, 0, w, h)

      // grid lines
      const cols = Math.floor(w / GRID)
      const rows = Math.floor(h / GRID)
      const ox = (w - cols * GRID) / 2
      const oy = (h - rows * GRID) / 2
      ctx.strokeStyle = lineColor
      ctx.globalAlpha = gridAlpha()
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = ox; x <= w + 0.5; x += GRID) { const px = Math.round(x) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, h) }
      for (let y = oy; y <= h + 0.5; y += GRID) { const py = Math.round(y) + 0.5; ctx.moveTo(0, py); ctx.lineTo(w, py) }
      ctx.stroke()
      ctx.globalAlpha = 1

      // spawn pacing
      spawnAcc += dt
      if (spawnAcc >= interval) { spawnAcc = 0; spawn() }

      // sprites: fade in → hold → fade out, with a little pop on entry
      for (let i = sprites.length - 1; i >= 0; i--) {
        const s = sprites[i]
        s.born += dt
        const t = s.born / s.life
        if (t >= 1) { sprites.splice(i, 1); continue }
        const fade = t < 0.22 ? t / 0.22 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1
        const sc = 0.85 + 0.15 * (t < 0.22 ? t / 0.22 : 1)
        const sprite = s.isRed ? red : green
        if (!sprite) continue
        const sz = s.size * sc
        ctx.globalAlpha = fade * s.peak
        ctx.drawImage(sprite, s.cx - sz / 2, s.cy - sz / 2, sz, sz)
      }
      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(frame)
    spawn(); spawn(); spawn()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
