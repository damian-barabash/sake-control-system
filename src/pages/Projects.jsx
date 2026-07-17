import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { AppShell } from '../components/AppShell'
import { StatusDot, StatusBadge, EmptyState, Spinner } from '../components/ui'
import { Donut, AreaChart, useCountUp } from '../components/charts'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { timeAgo } from '../lib/format'

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
}

function StatTile({ icon, label, value, tone = '#34C77F', delay = 0 }) {
  const n = useCountUp(value)
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
      <div className="mt-3 font-display text-[1.8rem] font-semibold leading-none tracking-tight tabular-nums">{n}</div>
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

export default function Projects() {
  const { isStaff } = useAuth()
  const { t } = useT()
  const [projects, setProjects] = useState([])
  const [latency, setLatency] = useState({ series: [], avg: null, now: null })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 86400000).toISOString()
    const [{ data }, { data: checks }] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, description, monitors(id, enabled, monitor_state(status, last_checked_at))')
        .order('created_at', { ascending: true }),
      supabase
        .from('checks')
        .select('latency_ms, checked_at, status')
        .gte('checked_at', since)
        .order('checked_at', { ascending: false })
        .limit(600),
    ])
    setProjects(data ?? [])
    setLatency(bucketLatency(checks))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  // roll-up stats for the tile row + donut
  const allStates = projects.flatMap((p) =>
    (p.monitors ?? []).filter((m) => m.enabled).map((m) => m.monitor_state?.status ?? 'unknown'),
  )
  const count = (s) => allStates.filter((x) => x === s).length
  const upCount = count('up')
  const issueCount = count('down') + count('degraded')
  const donutSegments = ['up', 'degraded', 'down', 'unknown']
    .map((s) => ({ key: s, value: count(s), color: STATUS_COLORS[s] }))

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
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatTile icon="folder" label={t('projects.title')} value={projects.length} tone="#34C77F" delay={0} />
            <StatTile icon="radar" label={t('project.monitors')} value={allStates.length} tone="#4C9AFF" delay={60} />
            <StatTile icon="check" label={t('enum.mstatus.up')} value={upCount} tone="#34C77F" delay={120} />
            <StatTile icon="alert" label={t('enum.mstatus.down')} value={issueCount} tone={issueCount ? '#E2564A' : '#8A968F'} delay={180} />
          </div>

          {/* overview row: donut + latency area */}
          <div className="mb-6 grid gap-4 lg:grid-cols-5">
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
                <div className="text-[13px] font-semibold text-ink">{t('overview.latency')}</div>
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => {
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
                  style={{ animationDelay: `${260 + Math.min(i, 8) * 70}ms` }}
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
        </>
      )}

      {showForm && (
        <ProjectFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={load} />
      )}
    </AppShell>
  )
}
