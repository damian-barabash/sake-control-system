import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { dict } from '../lib/i18n'
import { LangSwitch } from '../components/LangSwitch'
import { ThemeToggle } from '../components/ThemeToggle'
import GridBackground from '../landing/GridBackground'

const STATUS = { up: '#34C77F', down: '#E2564A', degraded: '#E3B341' }
const MAIL = {
  down: { tint: 'rgba(226,86,74,0.12)', bd: 'rgba(226,86,74,0.34)', dot: '#E2564A' },
  ssl: { tint: 'rgba(227,179,65,0.14)', bd: 'rgba(227,179,65,0.4)', dot: '#E3B341' },
  up: { tint: 'rgba(52,199,127,0.12)', bd: 'rgba(52,199,127,0.32)', dot: '#34C77F' },
}
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* lucide-style line icons */
const PATHS = {
  globe: 'M12 2a10 10 0 100 20 10 10 0 000-20M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20',
  server: 'M5 4h14v6H5zM5 14h14v6H5zM8 7h.01M8 17h.01',
  shield: 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
  database: 'M12 5c4.4 0 8-1.1 8-2.5S16.4 0 12 0 4 1.1 4 2.5 7.6 5 12 5M4 5v14c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5',
  activity: 'M3 12h4l3 8 4-16 3 8h4',
  alert: 'M12 3l9 16H3zM12 10v4M12 17h.01',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  cloud: 'M7 18a4 4 0 010-8 5 5 0 019.6-1.3A3.5 3.5 0 0117 18z',
}
function Ico({ name, className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  )
}
const FEATURE_ICONS = ['globe', 'server', 'shield', 'database', 'activity', 'alert']

function Label({ children }) {
  return <span className="text-[13px] font-medium text-accentText">{children}</span>
}
function Dot({ status }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {status === 'down' && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 pulse" style={{ background: STATUS[status] }} />}
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: STATUS[status] }} />
    </span>
  )
}
function SectionHead({ label, title, sub, center = true, labelColor }) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <span className="text-[13px] font-medium" style={{ color: labelColor || 'rgb(var(--c-accent-text))' }}>{label}</span>
      <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3.5 text-[15px] leading-relaxed text-muted">{sub}</p>}
    </div>
  )
}

/* ---------- live board + incoming email feed (fixed height) ---------- */
function LiveDemo({ lang }) {
  const L = dict(lang).landing
  const items = L.inbox.items
  const [feed, setFeed] = useState(() => [items[2], items[1], items[0], items[2]].map((m, i) => ({ ...m, id: `s${i}` })))
  const [tag, setTag] = useState('up')
  useEffect(() => {
    const its = dict(lang).landing.inbox.items
    setFeed([its[2], its[1], its[0], its[2]].map((m, i) => ({ ...m, id: `s${i}` })))
    setTag('up')
    let i = 2, n = 0
    const tm = setInterval(() => {
      i = (i + 1) % its.length; n += 1
      setTag(its[i].tag)
      setFeed((prev) => [{ ...its[i], id: `${Date.now()}-${n}` }, ...prev].slice(0, 4))
    }, 3200)
    return () => clearInterval(tm)
  }, [lang])
  const rows = [
    { name: L.incident.monitor, kind: 'HTTP(S)', status: tag === 'down' ? 'down' : 'up' },
    { name: 'Supabase · REST', kind: 'health', status: 'up' },
    { name: 'api.cert · SSL', kind: 'SSL', status: tag === 'ssl' ? 'degraded' : 'up' },
  ]
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex h-[440px] flex-col overflow-hidden rounded-2xl border border-line bg-surface/70 p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink">Dashboard</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> {L.inbox.live}
          </span>
        </div>
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.name} className="flex h-[64px] items-center gap-3 overflow-hidden rounded-xl border border-line bg-surface2 px-3.5 py-3">
              <Dot status={r.status} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink">{r.name}</div>
                <div className="text-[11px] text-faint">{r.kind}</div>
              </div>
              <span className="font-mono text-[11px]" style={{ color: STATUS[r.status] }}>{r.status === 'up' ? '84ms' : r.status === 'down' ? 'timeout' : '14d'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-[440px] flex-col overflow-hidden rounded-2xl border border-line bg-surface/70 p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink">Inbox</span>
          <span className="text-[11px] text-faint">{L.inbox.address}</span>
        </div>
        <div className="space-y-2.5">
          {feed.map((m, idx) => {
            const c = MAIL[m.tag]
            return (
              <div key={m.id} className={`${idx === 0 ? 'lp-emailin' : ''} flex h-[84px] gap-3 overflow-hidden rounded-xl border px-3.5 py-3`} style={{ background: c.tint, borderColor: c.bd }}>
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.dot }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-[13.5px] font-semibold text-ink">{m.subject}</div>
                    <span className="shrink-0 text-[10px] text-faint">{L.inbox.now}</span>
                  </div>
                  <p className="lp-clamp2 mt-0.5 text-[12.5px] leading-snug text-muted">{m.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ---------- incident demo ---------- */
function IncidentDemo({ lang, state }) {
  const L = dict(lang).landing.incident
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (state === 'down' || state === 'recovering') {
      const tm = setInterval(() => setSec((s) => s + 1), 1000)
      return () => clearInterval(tm)
    }
    if (state === 'ok') setSec(0)
  }, [state])
  const down = state === 'down', recovering = state === 'recovering', up = state === 'up'
  const color = down ? STATUS.down : recovering ? STATUS.degraded : STATUS.up
  const label = down ? L.outage : recovering ? L.recovering : up ? L.recovered : L.operational
  const mmss = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  const dt = up ? '02:14' : down || recovering ? mmss : '00:00'
  const stepActive = up ? 2 : recovering ? 1 : down ? 0 : -1
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-h-[280px] rounded-2xl border bg-surface/70 p-6" style={{ borderColor: down ? rgba(STATUS.down, 0.5) : 'rgb(var(--c-line))' }}>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium text-ink">{L.monitor}</span>
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium" style={{ color, background: rgba(color, 0.13) }}>
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}
          </span>
        </div>
        <div className="mt-7">
          <div className="text-[11px] text-faint">{L.downtime}</div>
          <div className="mt-1 font-mono text-5xl font-semibold tabular-nums" style={{ color: down || recovering ? color : 'rgb(var(--c-ink))' }}>{dt}</div>
        </div>
        <div className="mt-7 h-2 w-full overflow-hidden rounded-full bg-surface2">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: down ? '100%' : recovering ? '55%' : '0%', background: color }} />
        </div>
        <p className="mt-3 text-[12.5px] text-muted">{down || recovering ? L.reason : up ? L.recovered : L.operational}</p>
      </div>
      <div className="flex min-h-[280px] flex-col rounded-2xl border border-line bg-surface/70 p-6">
        <div className="rounded-xl border px-4 py-3 transition-opacity duration-500" style={{ opacity: down || recovering ? 1 : 0.25, background: rgba(STATUS.down, 0.1), borderColor: rgba(STATUS.down, 0.3) }}>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS.down }} />
            <span className="text-[13.5px] font-semibold text-ink">🔴 {L.monitor}</span>
          </div>
          <p className="mt-1 text-[12.5px] text-muted">{L.sent}</p>
        </div>
        <div className="mt-6 flex flex-1 flex-col justify-center gap-3.5">
          {L.steps.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px]" style={{ background: i <= stepActive ? rgba(color, 0.15) : 'rgb(var(--c-surface2))', color: i <= stepActive ? color : 'rgb(var(--c-faint))' }}>{i + 1}</span>
              <span className="text-[13.5px]" style={{ color: i <= stepActive ? 'rgb(var(--c-ink))' : 'rgb(var(--c-faint))' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- live latency pulse ---------- */
function PulseDemo({ lang }) {
  const L = dict(lang).landing.pulse
  const [bars, setBars] = useState(() => Array.from({ length: 48 }, () => 0.3 + Math.random() * 0.6))
  useEffect(() => {
    const tm = setInterval(() => setBars((b) => [...b.slice(1), 0.25 + Math.random() * 0.7]), 650)
    return () => clearInterval(tm)
  }, [])
  const latency = Math.round(bars[bars.length - 1] * 120 + 30)
  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-6 sm:p-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="font-display text-3xl font-semibold text-ink">99.98%</div>
          <div className="mt-1 text-[12px] text-faint">{L.uptime}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-semibold tabular-nums text-accentText">{latency}ms</div>
          <div className="mt-1 text-[12px] text-faint">{L.latency}</div>
        </div>
      </div>
      <div className="mt-6 flex h-24 items-end gap-1">
        {bars.map((v, i) => (
          <div key={i} className="flex-1 rounded-sm transition-all duration-500" style={{ height: `${Math.round(v * 100)}%`, background: i === bars.length - 1 ? STATUS.up : 'rgba(52,199,127,0.3)' }} />
        ))}
      </div>
    </div>
  )
}

/* ---------- store badge buttons ---------- */
function StoreButton({ kind, top, name, soon }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="group relative inline-flex items-center gap-3 rounded-xl border border-line2 bg-[#0c0e0d] px-4 py-2.5 text-white transition-transform hover:scale-[1.03]"
    >
      {kind === 'ios' ? (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.7c0-2 1.6-3 1.7-3-.9-1.4-2.4-1.5-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.4 2 1 0 1.3-.6 2.5-.6 1.2 0 1.5.6 2.5.6 1 0 1.7-1 2.3-2 .7-1.1 1-2.2 1-2.3 0 0-2-.8-2-3.1zM14.5 6c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9 0 1.8-.4 2.3-1.1z" /></svg>
      ) : (
        <svg className="h-6 w-6" viewBox="0 0 24 24"><path d="M3.6 2.3c-.2.2-.3.5-.3 1v17.4c0 .5.1.8.3 1l9.2-9.7L3.6 2.3z" fill="#34C77F" /><path d="M16.6 8.9 5.3 2.5c-.5-.3-1-.3-1.4-.1l9.1 9.6 3.6-3.1z" fill="#E3B341" /><path d="M16.6 15.1 13 12l-9.1 9.6c.4.2.9.2 1.4-.1l11.3-6.4z" fill="#E2564A" /><path d="m20.4 10.8-2.9-1.6-3.8 3.3 3.8 3.3 2.9-1.6c1-.6 1-2.2 0-2.8z" fill="#34C77F" /></svg>
      )}
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] text-white/65">{top}</span>
        <span className="font-display text-[16px] font-semibold">{name}</span>
      </span>
      {soon && <span className="absolute -right-2 -top-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-semibold text-[#06140d] shadow">{soon}</span>}
    </a>
  )
}

/* ---------- phone mockup ---------- */
function PhoneMock({ lang }) {
  const A = dict(lang).landing.app
  return (
    <div className="relative mx-auto w-[278px] shrink-0 lp-float">
      <div className="absolute -inset-6 -z-10 rounded-[3.2rem] bg-[radial-gradient(60%_50%_at_50%_30%,rgba(52,199,127,0.3)_0%,rgba(52,199,127,0)_70%)]" />
      <div className="rounded-[2.8rem] border border-line2 bg-[#0a0c0b] p-2.5 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)]">
        <div className="relative flex min-h-[600px] flex-col overflow-hidden rounded-[2.3rem] bg-[#0e110f]">
          {/* notch */}
          <div className="absolute left-1/2 top-2.5 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-[#0a0c0b]" />
          <div className="flex flex-1 flex-col px-4 pb-4 pt-12">
            <div className="flex items-center gap-2.5">
              <img src="./logo.png" alt="" className="h-7 w-7" />
              <div>
                <div className="font-display text-[14px] font-semibold text-white">Sake Control</div>
                <div className="text-[10px] text-white/45">{A.phoneTitle}</div>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {A.rows.map((r) => (
                <div key={r.name} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3.5">
                  <Dot status={r.status} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-white">{r.name}</div>
                    <div className="text-[10px] text-white/45">{r.kind}</div>
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS[r.status] }} />
                </div>
              ))}
            </div>
            <div className="mt-auto pt-5">
              <div className="rounded-xl py-3 text-center text-[12px] font-medium text-[#06140d]" style={{ background: STATUS.up }}>
                {dict(lang).landing.inbox.live}
              </div>
              {/* home indicator */}
              <div className="mx-auto mt-3 h-1 w-28 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- mobile app showcase ---------- */
function AppShowcase({ lang }) {
  const A = dict(lang).landing.app
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div>
        <span className="text-[13px] font-medium text-accentText">{A.label}</span>
        <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-4xl">{A.title}</h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">{A.sub}</p>
        <ul className="mt-6 space-y-2.5">
          {A.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink"><span className="mt-0.5 text-accent">✓</span> {f}</li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <StoreButton kind="ios" top={A.ios} name={A.iosName} soon={A.soon} />
          <StoreButton kind="android" top={A.android} name={A.androidName} soon={A.soon} />
        </div>
      </div>
      <PhoneMock lang={lang} />
    </div>
  )
}

/* ---------- Supabase keep-alive showcase ---------- */
const SB_GREEN = '#3ECF8E'

function SupabaseLogo({ className = 'h-8 w-8' }) {
  return (
    <svg className={className} viewBox="0 0 109 113" fill="none">
      <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874l-43.151 54.347Z" fill="url(#sbA)" />
      <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874l-43.151 54.347Z" fill="url(#sbB)" fillOpacity=".2" />
      <path d="M45.317 2.071c2.86-3.601 8.657-1.628 8.726 2.97l.442 67.251H9.83c-8.19 0-12.759-9.46-7.665-15.875L45.317 2.071Z" fill={SB_GREEN} />
      <defs>
        <linearGradient id="sbA" x1="53.974" y1="54.974" x2="94.163" y2="71.829" gradientUnits="userSpaceOnUse">
          <stop stopColor="#249361" />
          <stop offset="1" stopColor="#3ECF8E" />
        </linearGradient>
        <linearGradient id="sbB" x1="36.156" y1="30.578" x2="54.484" y2="65.081" gradientUnits="userSpaceOnUse">
          <stop />
          <stop offset="1" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function KeepAliveCard({ lang }) {
  const K = dict(lang).landing.keepalive.card
  const pingDays = [1, 4, 7]
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(60%_50%_at_50%_35%,rgba(62,207,142,0.22)_0%,rgba(62,207,142,0)_70%)]" />
      <div className="rounded-2xl border border-line bg-surface/70 p-6">
        <div className="flex items-center gap-3">
          <SupabaseLogo className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-medium text-ink">my-project.supabase.co</div>
            <div className="text-[11px] text-faint">{K.plan}</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium" style={{ color: SB_GREEN, borderColor: rgba(SB_GREEN, 0.35), background: rgba(SB_GREEN, 0.1) }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: SB_GREEN }} />
            {K.active}
          </span>
        </div>

        <div className="mt-6">
          <div className="mb-2.5 flex items-center justify-between text-[11px] text-faint">
            <span>{K.timeline}</span>
            <span className="font-mono">{K.window}</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const ping = pingDays.includes(d)
              return (
                <div
                  key={d}
                  className={`flex h-14 flex-col items-center justify-center gap-1.5 rounded-lg border ${ping ? '' : 'border-line bg-surface2'}`}
                  style={ping ? { borderColor: rgba(SB_GREEN, 0.4), background: rgba(SB_GREEN, 0.1) } : undefined}
                >
                  <span className={`text-[10px] ${ping ? 'font-semibold' : 'text-faint'}`} style={ping ? { color: SB_GREEN } : undefined}>{d}</span>
                  {ping ? (
                    <span style={{ color: SB_GREEN }}><Ico name="activity" className="h-3.5 w-3.5" /></span>
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-line2" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-line bg-surface2 px-3.5 py-3">
          <span className="shrink-0 text-accent"><Ico name="database" className="h-4 w-4" /></span>
          <span className="truncate font-mono text-[12px] text-muted">GET /storage/v1/bucket</span>
          <span className="ml-auto shrink-0 font-mono text-[11px]" style={{ color: SB_GREEN }}>{K.ok}</span>
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-xl border px-3.5 py-3" style={{ borderColor: 'rgba(226,86,74,0.28)', background: 'rgba(226,86,74,0.06)' }}>
          <span className="truncate text-[12px] text-muted line-through" style={{ textDecorationColor: 'rgba(226,86,74,0.65)' }}>{K.pause}</span>
          <span className="ml-auto shrink-0 text-[11px] font-medium" style={{ color: SB_GREEN }}>{K.never}</span>
        </div>
      </div>
    </div>
  )
}

function KeepAliveShowcase({ lang }) {
  const K = dict(lang).landing.keepalive
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div>
        <span className="inline-flex items-center gap-2 text-[13px] font-medium" style={{ color: SB_GREEN }}>
          <SupabaseLogo className="h-4 w-4" /> {K.label}
        </span>
        <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-4xl">{K.title}</h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">{K.sub}</p>
        <ul className="mt-6 space-y-2.5">
          {K.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink"><span className="mt-0.5" style={{ color: SB_GREEN }}>✓</span> {f}</li>
          ))}
        </ul>
        <p className="mt-6 max-w-md text-[12px] leading-relaxed text-faint">{K.note}</p>
      </div>
      <KeepAliveCard lang={lang} />
    </div>
  )
}

export default function Landing() {
  const { t, lang } = useT()
  const { session } = useAuth()
  const navigate = useNavigate()
  const L = dict(lang).landing
  const [booted, setBooted] = useState(false)
  const [yearly, setYearly] = useState(true)
  const [faqOpen, setFaqOpen] = useState(0)
  const [incident, setIncident] = useState('ok')
  const [menuOpen, setMenuOpen] = useState(false)
  const incidentRef = useRef(null)

  useEffect(() => {
    const tm = setTimeout(() => setBooted(true), 1850)
    return () => clearTimeout(tm)
  }, [])

  // incident block animation (drives only its own UI)
  useEffect(() => {
    const el = incidentRef.current
    if (!el) return
    let visible = false, i = 0, tm
    const seq = ['down', 'down', 'recovering', 'up', 'ok', 'ok']
    const tick = () => { setIncident(visible ? seq[i % seq.length] : 'ok'); i += 1; tm = setTimeout(tick, 1900) }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) { setIncident('ok'); i = 0 } }, { threshold: 0.4 })
    io.observe(el); tick()
    return () => { io.disconnect(); clearTimeout(tm) }
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const goApp = () => navigate(session ? '/app' : '/register')
  const nav = (id) => { setMenuOpen(false); scrollTo(id) }
  const navLinks = [
    { id: 'features', label: L.nav.features },
    { id: 'how', label: L.nav.how },
    { id: 'app', label: L.nav.app },
    { id: 'keepalive', label: L.nav.keepalive },
    { id: 'pricing', label: L.nav.pricing },
    { id: 'faq', label: L.nav.faq },
  ]

  return (
    <div className="relative min-h-screen font-sans text-ink antialiased">
      {/* living grid backdrop: faint grid + brand logos popping green / red */}
      <GridBackground className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgb(var(--c-bg) / 0) 40%, rgb(var(--c-bg) / 0.55) 100%)' }}
      />

      {/* preloader */}
      <div className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-bg transition-opacity duration-700 ${booted ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <img src="./logo.png" alt="Sake" className="h-24 w-24 lp-logoin drop-shadow-[0_18px_40px_rgba(52,199,127,0.35)]" />
        <span className="mt-7 text-[12px] tracking-wide text-accentText">{L.loader}</span>
      </div>

      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <button onClick={() => nav('top')} className="flex items-center gap-2.5">
            <img src="./logo.png" alt="Sake" className="h-8 w-8" />
            <span className="font-display font-semibold tracking-tight">Sake Control</span>
          </button>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((n) => (
              <button key={n.id} onClick={() => nav(n.id)} className="text-[14px] text-muted transition-colors hover:text-ink">{n.label}</button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <LangSwitch />
            {session ? (
              <button onClick={() => navigate('/app')} className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-[#06140d] transition-colors hover:bg-[#42d98c]">{t('topbar.projects')}</button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="text-[14px] text-muted transition-colors hover:text-ink">{L.nav.login}</button>
                <button onClick={() => navigate('/register')} className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-[#06140d] transition-colors hover:bg-[#42d98c]">{L.nav.signup}</button>
              </>
            )}
          </div>

          {/* mobile burger */}
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" className="rounded-md border border-line p-2 text-muted transition-colors hover:text-ink md:hidden">
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
            )}
          </button>
        </div>

        {/* mobile dropdown */}
        {menuOpen && (
          <div className="border-t border-line bg-bg/95 px-5 py-4 backdrop-blur md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((n) => (
                <button key={n.id} onClick={() => nav(n.id)} className="rounded-lg px-3 py-2.5 text-left text-[14px] text-muted transition-colors hover:bg-surface2 hover:text-ink">{n.label}</button>
              ))}
            </nav>
            <div className="mt-3 flex items-center gap-3 border-t border-line pt-4">
              <ThemeToggle />
              <LangSwitch />
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {session ? (
                <button onClick={() => navigate('/app')} className="w-full rounded-lg bg-accent py-2.5 text-[14px] font-medium text-[#06140d]">{t('topbar.projects')}</button>
              ) : (
                <>
                  <button onClick={() => navigate('/register')} className="w-full rounded-lg bg-accent py-2.5 text-[14px] font-medium text-[#06140d]">{L.nav.signup}</button>
                  <button onClick={() => navigate('/login')} className="w-full rounded-lg border border-line py-2.5 text-[14px] text-ink">{L.nav.login}</button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="relative z-10">
        {/* hero */}
        <section id="top" className="relative flex min-h-[92vh] items-center overflow-hidden pt-16">
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(56% 44% at 50% 44%, rgb(var(--c-bg) / 0.74) 0%, rgb(var(--c-bg) / 0.28) 46%, rgb(var(--c-bg) / 0) 72%)' }} />

          <div className="lp-rise relative z-10 mx-auto w-full max-w-3xl px-5 text-center">
            <h1 className="font-display text-[2.7rem] font-semibold leading-[1.04] tracking-tight sm:text-[4rem]">
              {L.hero.titleA}<br /><span className="text-accentText">{L.hero.titleB}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[1.05rem] leading-relaxed text-muted">{L.hero.sub}</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <button onClick={goApp} className="rounded-lg bg-accent px-6 py-3 text-[14px] font-medium text-[#06140d] shadow-[0_14px_34px_-12px_rgba(52,199,127,0.7)] transition-colors hover:bg-[#42d98c]">{L.hero.ctaPrimary}</button>
              <button onClick={() => scrollTo('features')} className="rounded-lg border border-line2 bg-surface/60 px-6 py-3 text-[14px] font-medium text-ink backdrop-blur transition-colors hover:border-muted">{L.hero.ctaSecondary}</button>
            </div>
            <p className="mt-5 text-[12.5px] text-faint">{L.hero.note}</p>
          </div>
        </section>

        {/* features bento */}
        <section id="features" className="py-24">
          <div className="mx-auto max-w-6xl px-5">
            <SectionHead label={L.features.label} title={L.features.title} />
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {L.features.items.map((f, i) => (
                <div key={i} className="rounded-2xl border border-line bg-surface/60 p-7">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-accentText">
                    <Ico name={FEATURE_ICONS[i]} />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-ink">{f.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* live demo panel */}
        <section className="py-24">
          <div className="mx-auto max-w-6xl px-5">
            <SectionHead label={L.inbox.label} title={L.inbox.title} sub={L.inbox.sub} />
            <div className="mt-14"><LiveDemo lang={lang} /></div>
          </div>
        </section>

        {/* mobile app */}
        <section id="app" className="py-24">
          <div className="mx-auto max-w-6xl px-5">
            <AppShowcase lang={lang} />
          </div>
        </section>

        {/* supabase keep-alive */}
        <section id="keepalive" className="py-24">
          <div className="mx-auto max-w-6xl px-5">
            <KeepAliveShowcase lang={lang} />
          </div>
        </section>

        {/* incident panel */}
        <section ref={incidentRef} className="py-24">
          <div className="mx-auto max-w-6xl px-5">
            <SectionHead label={L.incident.label} title={L.incident.title} sub={L.incident.sub} labelColor={STATUS.down} />
            <div className="mt-14"><IncidentDemo lang={lang} state={incident} /></div>
          </div>
        </section>

        {/* pulse panel */}
        <section className="py-24">
          <div className="mx-auto max-w-3xl px-5">
            <SectionHead label={L.pulse.label} title={L.pulse.title} sub={L.pulse.sub} />
            <div className="mt-14"><PulseDemo lang={lang} /></div>
          </div>
        </section>

        {/* how */}
        <section id="how" className="py-24">
          <div className="mx-auto max-w-6xl px-5">
            <SectionHead label={L.how.label} title={L.how.title} />
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {L.how.steps.map((s) => (
                <div key={s.n} className="rounded-2xl border border-line bg-surface/60 p-7">
                  <div className="font-display text-3xl font-semibold text-accentText/40">{s.n}</div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* pricing */}
        <section id="pricing" className="py-24">
          <div className="mx-auto max-w-6xl px-5">
            <SectionHead label={L.pricing.label} title={L.pricing.title} sub={L.pricing.sub} />
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1">
                <button onClick={() => setYearly(false)} className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${!yearly ? 'bg-accent text-[#06140d]' : 'text-muted'}`}>{L.pricing.monthly}</button>
                <button onClick={() => setYearly(true)} className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${yearly ? 'bg-accent text-[#06140d]' : 'text-muted'}`}>{L.pricing.yearly}</button>
              </div>
            </div>
            {yearly && <div className="mt-3 text-center text-[12.5px] text-accentText">{L.pricing.save}</div>}

            <div className="mx-auto mt-10 max-w-md">
              <div className="relative flex flex-col rounded-2xl border-2 border-accent bg-surface p-8 shadow-[0_30px_70px_-40px_rgba(52,199,127,0.6)]">
                <span className="absolute -top-3 left-8 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-[#06140d]">{L.pricing.trial}</span>
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-[15px] font-semibold text-accentText">{L.pricing.pro.name}</div>
                  <div className="text-[12px] text-faint">{L.pricing.pro.badge}</div>
                </div>
                <div className="mt-4 flex items-end gap-1.5">
                  <span className="font-display text-5xl font-semibold">{yearly ? '$75' : '$7'}</span>
                  <span className="mb-1.5 text-[12px] text-faint">{yearly ? L.pricing.perYear : L.pricing.perMonth}</span>
                </div>
                <ul className="mt-6 space-y-3 text-[14px] text-ink">
                  {L.pricing.pro.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5"><span className="text-accent">✓</span> {f}</li>
                  ))}
                </ul>
                <button onClick={goApp} className="mt-8 w-full rounded-lg bg-accent py-3 text-[14px] font-medium text-[#06140d] transition-colors hover:bg-[#42d98c]">{L.pricing.pro.cta}</button>
                <p className="mt-4 text-center text-[12px] text-faint">{L.pricing.trialNote}</p>
              </div>
            </div>
          </div>
        </section>

        {/* faq */}
        <section id="faq" className="py-24">
          <div className="mx-auto max-w-3xl px-5">
            <SectionHead label={L.faq.label} title={L.faq.title} />
            <div className="mt-12 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/60">
              {L.faq.items.map((it, i) => {
                const open = faqOpen === i
                return (
                  <div key={i}>
                    <button onClick={() => setFaqOpen(open ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
                      <span className="text-[15px] font-medium text-ink">{it.q}</span>
                      <span className={`shrink-0 text-accentText transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
                    </button>
                    <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
                      <div className="overflow-hidden"><p className="px-6 pb-5 text-[14px] leading-relaxed text-muted">{it.a}</p></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* final CTA */}
        <section className="relative overflow-hidden py-24 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_10%,rgba(52,199,127,0.14)_0%,rgba(52,199,127,0)_70%)]" />
          <div className="relative mx-auto max-w-2xl px-5">
            <img src="./logo.png" alt="Sake" className="mx-auto h-14 w-14 lp-float" />
            <h2 className="mt-7 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{L.finalCta.title}</h2>
            <p className="mt-4 text-muted">{L.finalCta.sub}</p>
            <button onClick={goApp} className="mt-9 rounded-lg bg-accent px-7 py-3 text-[14px] font-medium text-[#06140d] transition-transform hover:scale-[1.03]">{L.finalCta.button}</button>
          </div>
        </section>

        {/* footer */}
        <footer className="border-t border-line py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <img src="./logo.png" alt="Sake" className="h-7 w-7" />
              <span className="text-[13px] text-muted">{L.footer.tagline}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <a href="/privacy/" className="text-[12px] text-faint transition-colors hover:text-ink">{L.footer.privacy}</a>
              <a href="/refund/" className="text-[12px] text-faint transition-colors hover:text-ink">{L.footer.refund}</a>
              <a href="mailto:dbdcstudio@gmail.com" className="text-[12px] text-faint transition-colors hover:text-ink">{L.footer.contact}</a>
            </div>
            <span className="text-[12px] text-faint">© MMXXVI · {L.footer.rights}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
