import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { TopBar } from '../components/TopBar'
import { StatusDot, EmptyState, Spinner } from '../components/ui'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { timeAgo } from '../lib/format'

function aggregate(states) {
  if (!states.length) return 'unknown'
  if (states.some((s) => s === 'down')) return 'down'
  if (states.some((s) => s === 'degraded')) return 'degraded'
  if (states.every((s) => s === 'up')) return 'up'
  return 'unknown'
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

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-9">
        <div className="flex items-center justify-between mb-7 gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t('projects.title')}</h1>
            <p className="label mt-1.5">{t('projects.refreshNote')}</p>
          </div>
          {isStaff && (
            <button className="btn-solid" onClick={() => setShowForm(true)}>
              + {t('projects.newProject')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-24 flex justify-center">
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
                  className="card p-5 hover:border-line2 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-ink truncate group-hover:text-accent transition-colors">{p.name}</h2>
                      {p.description && (
                        <p className="text-[13px] text-faint mt-0.5 truncate">{p.description}</p>
                      )}
                    </div>
                    <StatusDot status={agg} pulse />
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="label">
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
                    <div className="mt-3 pt-3 border-t border-line label text-faint">
                      {t('projects.updated')} {timeAgo(last)}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {showForm && (
        <ProjectFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={load} />
      )}
    </div>
  )
}
