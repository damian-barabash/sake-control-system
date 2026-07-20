import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { AppShell } from '../components/AppShell'
import { StatusDot, StatusBadge, EmptyState, Spinner } from '../components/ui'
import { Donut, AreaChart, useCountUp } from '../components/charts'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { timeAgo, formatDuration, formatLatency, formatUptime } from '../lib/format'

const STATUS_COLORS = { up: '#34C77F', degraded: '#E3B341', down: '#E2564A', unknown: '#8A968F' }

function aggregate(states) {
  if (!states.length) return 'unknown'
  if (states.some((s) => s === 'down')) return 'down'
  if (states.some((s) => s === 'degraded')) return 'degraded'
  if (states.every((s) => s === 'up')) return 'up'
  return 'unknown'
}

/* icon paths for the KPI tiles (lucide-style) */
const TILE_ICONS = {
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  radar: 'M12 2a10 10 0 100 20 10 10 0 000-20M12 6a6 6 0 100 12 6 6 0 000-12M12 10a2 2 0 100 4 2 2 0 000-4',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 3l9 16H3zM12 10v4M12 17h.01',
  gauge: 'M12 14l3.5-3.5M3.34 19a10 10 0 1117.32 0',
  bolt: 'M13 2L3 14h9l-1 8 10-12h-9z',
}

function StatTile({ icon, label, value, text, tone = '#34C77F', delay = 0 }) {
  const n = useCountUp(text != null ? 0 : value)
  return (
    <div className="stat-tile a-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${tone}1c`, color: tone }}
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d={TILE_ICONS[icon]} />
          </svg>
        </span>
        <span className="text-[12px] text-faint">{label}</span>
      </div>
      <div className="mt-3 font-display text-[1.8rem] font-semibold leading-none tracking-tight tabular-nums">{text != null ? text : n}</div>
    </div>
  )
}

/* checks → 24 hourly buckets of average latency (oldest→newest) */
function bucketLatency(rows) {
  if (!rows?.length) return { series: [], avg: null, now: null }
  const buckets = new Map()
  for (const r of rows) {
    if (r.status === 'down' || r.latency_ms == null) continue
    const h = Math.floor(new Date(r.checked_at).getTime() / 3600000)
    const b = buckets.get(h) ?? { sum: 0, n: 0 }
    b.sum += r.latency_ms
    b.n += 1
    buckets.set(h, b)
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b)
  const series = keys.map((k) => Math.round(buckets.get(k).sum / buckets.get(k).n))
  const all = rows.filter((r) => r.status !== 'down' && r.latency_ms != null)
  const avg = all.length ? Math.round(all.reduce((s, r) => s + r.latency_ms, 0) / all.length) : null
  const now = all.length ? all[0].latency_ms : null // rows come newest-first
  return { series, avg, now }
}

function InsightCard({ title, delay, children }) {
  return (
    <div className="card a-in flex flex-col p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-3.5 text-[13px] font-semibold text-ink">{title}</div>
      {children}
    </div>
  )
}

function InsightEmpty({ children }) {
  return <div className="flex flex-1 items-center justify-center py-8 text-center text-[12.5px] text-faint">{children}</div>
}

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export default function Projects() {
  const { isStaff } = useAuth()
  const { t } = useT()
  const [projects, setProjects] = useState([])
  const [latency, setLatency] = useState({ series: [], avg: null, now: null })
  const [checksCount, setChecksCount] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 86400000).toISOString()
    const [{ data }, { data: checks, count }, { data: incs }] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, description, monitors(id, name, enabled, ssl_warn_days, monitor_state(status, last_checked_at, last_latency_ms, uptime_24h, ssl_days_left))')
        .order('created_at', { ascending: true }),
      supabase
        .from('checks')
        .select('latency_ms, checked_at, status', { count: 'exact' })
        .gte('checked_at', since)
        .order('checked_at', { ascending: false })
        .limit(600),
      supabase
        .from('incidents')
        .select('id, monitor_id, status, started_at, resolved_at')
        .order('started_at', { ascending: false })
        .limit(30),
    ])
    setProjects(data ?? [])
    setLatency(bucketLatency(checks))
    setChecksCount(count ?? null)
    setIncidents(incs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  // roll-up stats for the tile row + donut
  const allMons = projects.flatMap((p) =>
    (p.monitors ?? []).filter((m) => m.enabled).map((m) => ({ ...m, project: p.name, projectId: p.id })),
  )
  const allStates = allMons.map((m) => m.monitor_state?.status ?? 'unknown')
  const count = (s) => allStates.filter((x) => x === s).length
  const upCount = count('up')
  const issueCount = count('down') + count('degraded')
  const donutSegments = ['up', 'degraded', 'down', 'unknown']
    .map((s) => ({ key: s, value: count(s), color: STATUS_COLORS[s] }))

  // uptime 24h averaged over monitors that already have it
  const uptimes = allMons.map((m) => m.monitor_state?.uptime_24h).filter((v) => v != null)
  const avgUptime = uptimes.length ? uptimes.reduce((s, v) => s + Number(v), 0) / uptimes.length : null

  // incidents: 7-day count + recent feed with resolved names
  const since7d = Date.now() - 7 * 86400000
  const incidents7 = incidents.filter((i) => new Date(i.started_at).getTime() >= since7d).length
  const monByIdEntries = projects.flatMap((p) => (p.monitors ?? []).map((m) => [m.id, { name: m.name, project: p.name }]))
  const monById = useMemo(() => Object.fromEntries(monByIdEntries), [projects]) // eslint-disable-line react-hooks/exhaustive-deps
  const feed = incidents.slice(0, 6)

  // SSL watch: certificates closest to expiry first
  const sslMons = allMons
    .filter((m) => m.monitor_state?.ssl_days_left != null)
    .sort((a, b) => a.monitor_state.ssl_days_left - b.monitor_state.ssl_days_left)
    .slice(0, 5)

  // slowest monitors by last latency
  const slowMons = allMons
    .filter((m) => m.monitor_state?.last_latency_ms != null)
    .sort((a, b) => b.monitor_state.last_latency_ms - a.monitor_state.last_latency_ms)
    .slice(0, 5)
  const slowMax = slowMons[0]?.monitor_state.last_latency_ms || 1

  // project cards: search + status filter
  const FILTERS = ['all', 'issues', 'up', 'unknown']
  const filtered = projects.filter((p) => {
    const q = query.trim().toLowerCase()
    if (q && !`${p.name} ${p.description ?? ''}`.toLowerCase().includes(q)) return false
    if (filter === 'all') return true
    const states = (p.monitors ?? []).filter((m) => m.enabled).map((m) => m.monitor_state?.status ?? 'unknown')
    const agg = aggregate(states)
    if (filter === 'issues') return agg === 'down' || agg === 'degraded'
    if (filter === 'up') return agg === 'up'
    return agg === 'unknown'
  })

  return (
    <AppShell
      title={t('projects.title')}
      actions={
        isStaff && (
          <button className="btn-solid !py-2 hidden sm:inline-flex" onClick={() => setShowForm(true)}>
            + {t('projects.newProject')}
          </button>
        )
      }
    >
      <div className="a-in mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.45rem] font-semibold tracking-tight">{t('projects.title')}</h1>
          <p className="mt-1 text-[12.5px] text-faint">{t('projects.refreshNote')}</p>
        </div>
        {isStaff && (
          <button className="btn-solid sm:hidden" onClick={() => setShowForm(true)}>
            + {t('projects.newProject')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-7 w-7" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState title={t('projects.empty')} hint={t('projects.emptyHint')}>
          {isStaff && (
            <button className="btn-solid" onClick={() => setShowForm(true)}>
              + {t('projects.newProject')}
            </button>
          )}
        </EmptyState>
      ) : (
        <>
          {/* KPI roll-up */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
            <StatTile icon="folder" label={t('projects.title')} value={projects.length} tone="#34C77F" delay={0} />
            <StatTile icon="radar" label={t('project.monitors')} value={allStates.length} tone="#4C9AFF" delay={50} />
            <StatTile icon="check" label={t('enum.mstatus.up')} value={upCount} tone="#34C77F" delay={100} />
            <StatTile icon="alert" label={t('enum.mstatus.down')} value={issueCount} tone={issueCount ? '#E2564A' : '#8A968F'} delay={150} />
            <StatTile icon="gauge" label={t('overview.uptime24')} text={avgUptime != null ? formatUptime(avgUptime) : '—'} tone="#9A7BFF" delay={200} />
            <StatTile icon="bolt" label={t('overview.incidents7')} value={incidents7} tone={incidents7 ? '#E3B341' : '#8A968F'} delay={250} />
          </div>

          {/* overview row: donut + latency area */}
          <div className="mb-4 grid gap-4 lg:grid-cols-5">
            <div className="card a-in p-5 sm:p-6 lg:col-span-2" style={{ animationDelay: '160ms', background: 'linear-gradient(155deg, rgba(52,199,127,0.07) 0%, rgb(var(--c-surface)) 45%)' }}>
              <div className="text-[13px] font-semibold text-ink">{t('overview.monitorsSplit')}</div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <Donut
                  segments={donutSegments}
                  centerTitle={allStates.length}
                  centerSub={t('overview.total')}
                />
                <ul className="min-w-0 space-y-2.5">
                  {donutSegments.map((s) => (
                    <li key={s.key} className="flex items-center gap-2.5 text-[13px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="truncate text-muted">{t('enum.mstatus.' + s.key)}</span>
                      <span className="ml-auto font-mono text-[12.5px] tabular-nums text-ink">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="card a-in flex flex-col p-5 sm:p-6 lg:col-span-3" style={{ animationDelay: '220ms' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[13px] font-semibold text-ink">{t('overview.latency')}</div>
                  {checksCount != null && (
                    <div className="mt-0.5 text-[11px] text-faint">{t('overview.checks24', { n: checksCount })}</div>
                  )}
                </div>
                <div className="flex items-center gap-5">
                  {latency.avg != null && (
                    <span className="text-right">
                      <span className="block font-mono text-[15px] tabular-nums text-ink">{latency.avg} ms</span>
                      <span className="block text-[10.5px] text-faint">{t('overview.avg')}</span>
                    </span>
                  )}
                  {latency.now != null && (
                    <span className="text-right">
                      <span className="block font-mono text-[15px] tabular-nums text-accentText">{latency.now} ms</span>
                      <span className="block text-[10.5px] text-faint">{t('overview.now')}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 flex-1">
                {latency.series.length >= 2 ? (
                  <AreaChart points={latency.series} height={150} />
                ) : (
                  <div className="flex h-[150px] items-center justify-center text-[12.5px] text-faint">{t('overview.noData')}</div>
                )}
              </div>
            </div>
          </div>

          {/* insight row: incidents feed + SSL watch + slowest monitors */}
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <InsightCard title={t('overview.incidentsFeed')} delay={260}>
              {feed.length === 0 ? (
                <InsightEmpty>{t('overview.incidentsEmpty')}</InsightEmpty>
              ) : (
                <ul className="divide-y divide-line/70">
                  {feed.map((inc) => {
                    const m = monById[inc.monitor_id]
                    const open = inc.status === 'open'
                    return (
                      <li key={inc.id} className="flex items-center gap-2.5 py-2.5">
                        <StatusDot status={open ? 'down' : 'up'} pulse={open} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-ink">{m?.name ?? '—'}</span>
                          <span className="block truncate text-[10.5px] text-faint">{m?.project ?? ''}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-[11.5px]" style={{ color: open ? '#E2564A' : '#34C77F' }}>
                            {open
                              ? t('project.downFor', { dur: formatDuration(inc.started_at) })
                              : t('project.resolvedIn', { dur: formatDuration(inc.started_at, inc.resolved_at) })}
                          </span>
                          <span className="block text-[10px] text-faint">{timeAgo(inc.started_at)}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </InsightCard>

            <InsightCard title={t('overview.sslWatch')} delay={320}>
              {sslMons.length === 0 ? (
                <InsightEmpty>{t('overview.sslEmpty')}</InsightEmpty>
              ) : (
                <ul className="divide-y divide-line/70">
                  {sslMons.map((m) => {
                    const days = m.monitor_state.ssl_days_left
                    const warn = m.ssl_warn_days ?? 14
                    const tone = days <= 7 ? '#E2564A' : days <= warn ? '#E3B341' : '#34C77F'
                    return (
                      <li key={m.id} className="flex items-center gap-2.5 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-ink">{m.name}</span>
                          <span className="block truncate text-[10.5px] text-faint">{m.project}</span>
                        </span>
                        <span
                          className="shrink-0 rounded-full border px-2.5 py-1 font-mono text-[11px] tabular-nums"
                          style={{ color: tone, borderColor: rgba(tone, 0.35), background: rgba(tone, 0.1) }}
                        >
                          {t('overview.sslDays', { n: days })}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </InsightCard>

            <InsightCard title={t('overview.slowest')} delay={380}>
              {slowMons.length === 0 ? (
                <InsightEmpty>{t('overview.slowestEmpty')}</InsightEmpty>
              ) : (
                <ul className="space-y-3">
                  {slowMons.map((m) => {
                    const ms = m.monitor_state.last_latency_ms
                    const tone = ms >= 2000 ? '#E3B341' : '#34C77F'
                    return (
                      <li key={m.id}>
                        <div className="flex items-center gap-2.5">
                          <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{m.name}</span>
                          <span className="shrink-0 font-mono text-[11.5px] tabular-nums" style={{ color: tone }}>
                            {formatLatency(ms)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(6, Math.round((ms / slowMax) * 100))}%`, background: `linear-gradient(90deg, ${rgba(tone, 0.35)}, ${tone})` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </InsightCard>
          </div>

          {/* toolbar: search + status filters */}
          <div className="a-in mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: '420ms' }}>
            <div className="relative sm:w-72">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                className="field-box !pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('projects.search')}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    filter === f
                      ? 'border-accent/60 bg-accent/15 text-accentText'
                      : 'border-line text-muted hover:bg-surface2 hover:text-ink'
                  }`}
                >
                  {t('projects.f' + f[0].toUpperCase() + f.slice(1))}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-faint">{t('projects.noMatch')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p, i) => {
                const mons = (p.monitors ?? []).filter((m) => m.enabled)
                const states = mons.map((m) => m.monitor_state?.status ?? 'unknown')
                const agg = aggregate(states)
                const downCount = states.filter((s) => s === 'down' || s === 'degraded').length
                const lastChecks = mons
                  .map((m) => m.monitor_state?.last_checked_at)
                  .filter(Boolean)
                  .sort()
                const last = lastChecks[lastChecks.length - 1]
                return (
                  <Link
                    key={p.id}
                    to={`/project/${p.id}`}
                    className="card a-in group p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_24px_50px_-30px_rgba(52,199,127,0.45)]"
                    style={{ animationDelay: `${460 + Math.min(i, 8) * 70}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-ink transition-colors group-hover:text-accentText">{p.name}</h2>
                        {p.description && (
                          <p className="mt-0.5 truncate text-[13px] text-faint">{p.description}</p>
                        )}
                      </div>
                      <StatusBadge status={agg} size="sm" />
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-[12px] text-faint">
                        {mons.length ? t('projects.monitors', { n: mons.length }) : t('projects.noMonitors')}
                      </span>
                      <span
                        className="font-mono text-[11px]"
                        style={{
                          color: agg === 'up' ? '#34C77F' : agg === 'unknown' ? '#8A968F' : '#E2564A',
                        }}
                      >
                        {mons.length === 0
                          ? '—'
                          : downCount === 0
                            ? t('projects.allUp')
                            : t('projects.issues', { n: downCount })}
                      </span>
                    </div>
                    {last && (
                      <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[11.5px] text-faint">
                        <StatusDot status={agg} pulse />
                        {t('projects.updated')} {timeAgo(last)}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {showForm && (
        <ProjectFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={load} />
      )}
    </AppShell>
  )
}
