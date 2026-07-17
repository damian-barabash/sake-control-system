import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { AppShell } from '../components/AppShell'
import { StatusDot, StatusBadge, EmptyState, Spinner } from '../components/ui'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { timeAgo } from '../lib/format'

function aggregate(states) {
  if (!states.length) return 'unknown'
  if (states.some((s) => s === 'down')) return 'down'
  if (states.some((s) => s === 'degraded')) return 'degraded'
  if (states.every((s) => s === 'up')) return 'up'
  return 'unknown'
}

function StatTile({ label, value, tone }) {
  return (
    <div className="stat-tile">
      <div className="text-[11.5px] text-faint">{label}</div>
      <div className="mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-tight" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
    </div>
  )
}

export default function Projects() {
  const { isStaff } = useAuth()
  const { t } = useT()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, description, monitors(id, enabled, monitor_state(status, last_checked_at))')
      .order('created_at', { ascending: true })
    setProjects(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  // roll-up stats for the tile row
  const allStates = projects.flatMap((p) =>
    (p.monitors ?? []).filter((m) => m.enabled).map((m) => m.monitor_state?.status ?? 'unknown'),
  )
  const upCount = allStates.filter((s) => s === 'up').length
  const issueCount = allStates.filter((s) => s === 'down' || s === 'degraded').length

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
      <div className="mb-6 flex items-end justify-between gap-4">
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
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatTile label={t('projects.title')} value={projects.length} />
            <StatTile label={t('project.monitors')} value={allStates.length} />
            <StatTile label={t('enum.mstatus.up')} value={upCount} tone="#34C77F" />
            <StatTile label={t('enum.mstatus.down')} value={issueCount} tone={issueCount ? '#E2564A' : undefined} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
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
                  className="card group p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_24px_50px_-30px_rgba(52,199,127,0.45)]"
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
