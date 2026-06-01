import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { TopBar } from '../components/TopBar'
import { StatusBadge, StatusDot, EmptyState, Spinner } from '../components/ui'
import { Sparkline } from '../components/Sparkline'
import { MonitorFormModal } from '../components/MonitorFormModal'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { ManageMembersModal } from '../components/ManageMembersModal'
import { checkNow } from '../lib/notify'
import { formatLatency, formatUptime, timeAgo, formatDuration } from '../lib/format'

function MonitorRow({ monitor, history, isAdmin, onEdit, onDelete, onReload }) {
  const { t } = useT()
  const [checking, setChecking] = useState(false)
  const st = monitor.monitor_state ?? {}
  const status = st.status ?? 'unknown'

  async function runNow() {
    setChecking(true)
    await checkNow(monitor.id)
    setTimeout(async () => {
      await onReload()
      setChecking(false)
    }, 1500)
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="pt-1.5">
          <StatusDot status={status} pulse />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-medium text-ink truncate">{monitor.name}</h3>
            <span className="label">{t('enum.mtype.' + monitor.type)}</span>
            {!monitor.enabled && <span className="label text-down">off</span>}
            {monitor.executor === 'mac' && <span className="label text-accent">mac</span>}
          </div>
          <a
            href={monitor.type === 'http' || monitor.type === 'keyword' || monitor.type === 'ssl' ? monitor.target : undefined}
            target="_blank"
            rel="noreferrer"
            className="block text-[13px] text-faint mt-0.5 truncate hover:text-muted"
          >
            {monitor.target}
            {monitor.port ? `:${monitor.port}` : ''}
          </a>

          <div className="mt-3 flex items-center gap-x-6 gap-y-1.5 flex-wrap">
            <Metric label={t('project.uptime')} value={formatUptime(st.uptime_24h)} />
            <Metric label={t('project.latency')} value={formatLatency(st.last_latency_ms)} />
            <Metric
              label={t('project.lastCheck')}
              value={st.last_checked_at ? timeAgo(st.last_checked_at) : t('project.never')}
            />
            {st.ssl_days_left != null && (
              <Metric label="SSL" value={`${st.ssl_days_left} d`} warn={st.ssl_days_left <= (monitor.ssl_warn_days ?? 14)} />
            )}
          </div>
          {st.last_error && status !== 'up' && (
            <p className="mt-2 text-[12px] text-down/90 font-mono truncate">{st.last_error}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <Sparkline points={history} />
          <div className="flex items-center gap-2">
            <button
              onClick={runNow}
              disabled={checking}
              className="font-mono uppercase tracking-label text-[9px] text-muted hover:text-ink border border-line rounded px-2 py-1 transition-colors disabled:opacity-50"
            >
              {checking ? t('project.checking') : t('project.runNow')}
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(monitor)}
                  className="font-mono uppercase tracking-label text-[9px] text-muted hover:text-ink border border-line rounded px-2 py-1 transition-colors"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => onDelete(monitor)}
                  className="font-mono uppercase tracking-label text-[9px] text-down/80 hover:text-down border border-line rounded px-2 py-1 transition-colors"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, warn }) {
  return (
    <span className="inline-flex flex-col">
      <span className="label-sm">{label}</span>
      <span className={`text-[13px] font-mono ${warn ? 'text-degraded' : 'text-ink'}`}>{value}</span>
    </span>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { t } = useT()
  const [project, setProject] = useState(null)
  const [monitors, setMonitors] = useState([])
  const [history, setHistory] = useState({}) // monitor_id -> [points oldest→newest]
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [monitorForm, setMonitorForm] = useState(null) // {monitor|null} when open
  const [showSettings, setShowSettings] = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  const load = useCallback(async () => {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
    setProject(proj)
    const { data: mons } = await supabase
      .from('monitors')
      .select('*, monitor_state(*)')
      .eq('project_id', id)
      .order('created_at', { ascending: true })
    const list = mons ?? []
    setMonitors(list)

    const ids = list.map((m) => m.id)
    if (ids.length) {
      const [{ data: checks }, { data: incs }] = await Promise.all([
        supabase
          .from('checks')
          .select('monitor_id, status, latency_ms, checked_at')
          .in('monitor_id', ids)
          .order('checked_at', { ascending: false })
          .limit(ids.length * 24),
        supabase
          .from('incidents')
          .select('id, monitor_id, status, started_at, resolved_at, cause')
          .in('monitor_id', ids)
          .order('started_at', { ascending: false })
          .limit(15),
      ])
      const grouped = {}
      for (const c of checks ?? []) {
        ;(grouped[c.monitor_id] ??= []).push(c)
      }
      for (const k of Object.keys(grouped)) grouped[k] = grouped[k].slice(0, 24).reverse()
      setHistory(grouped)
      setIncidents(incs ?? [])
    } else {
      setHistory({})
      setIncidents([])
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
    const tid = setInterval(load, 30000)
    return () => clearInterval(tid)
  }, [load])

  async function deleteMonitor(m) {
    if (!confirm(t('monitorForm.deleteConfirm', { name: m.name }))) return
    await supabase.from('monitors').delete().eq('id', m.id)
    load()
  }

  async function deleteProject() {
    if (!confirm(t('project.deleteConfirm', { name: project.name }))) return
    await supabase.from('projects').delete().eq('id', project.id)
    navigate('/app')
  }

  const monName = (mid) => monitors.find((m) => m.id === mid)?.name ?? '—'

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-9">
        <Link to="/app" className="label hover:text-ink transition-colors">
          {t('project.back')}
        </Link>

        {loading && !project ? (
          <div className="py-24 flex justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : !project ? (
          <EmptyState title="404" />
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mt-3 mb-7 flex-wrap">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
                {project.description && <p className="text-sm text-faint mt-1">{project.description}</p>}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="btn-ghost" onClick={() => setShowMembers(true)}>
                    {t('project.members')}
                  </button>
                  <button className="btn-ghost" onClick={() => setShowSettings(true)}>
                    {t('project.settings')}
                  </button>
                  <button className="btn-solid" onClick={() => setMonitorForm({ monitor: null })}>
                    + {t('project.addMonitor')}
                  </button>
                </div>
              )}
            </div>

            {/* monitors */}
            {monitors.length === 0 ? (
              <EmptyState title={t('project.noMonitors')} hint={t('project.noMonitorsHint')}>
                {isAdmin && (
                  <button className="btn-solid" onClick={() => setMonitorForm({ monitor: null })}>
                    + {t('project.addMonitor')}
                  </button>
                )}
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {monitors.map((m) => (
                  <MonitorRow
                    key={m.id}
                    monitor={m}
                    history={history[m.id] ?? []}
                    isAdmin={isAdmin}
                    onEdit={(mon) => setMonitorForm({ monitor: mon })}
                    onDelete={deleteMonitor}
                    onReload={load}
                  />
                ))}
              </div>
            )}

            {/* incidents */}
            <div className="mt-10">
              <h2 className="label mb-3">{t('project.incidents')}</h2>
              {incidents.length === 0 ? (
                <p className="text-sm text-faint">{t('project.noIncidents')}</p>
              ) : (
                <div className="card divide-y divide-line">
                  {incidents.map((inc) => (
                    <div key={inc.id} className="flex items-center gap-3 px-4 py-3">
                      <StatusDot status={inc.status === 'open' ? 'down' : 'up'} />
                      <span className="text-sm text-ink min-w-0 flex-1 truncate">{monName(inc.monitor_id)}</span>
                      <span className="text-[12px] text-faint font-mono">
                        {inc.status === 'open'
                          ? t('project.downFor', { dur: formatDuration(inc.started_at) })
                          : t('project.resolvedIn', { dur: formatDuration(inc.started_at, inc.resolved_at) })}
                      </span>
                      <span className="label-sm hidden sm:block">{timeAgo(inc.started_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="mt-12 pt-6 border-t border-line">
                <button className="btn-danger" onClick={deleteProject}>
                  {t('project.deleteProject')}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {monitorForm && (
        <MonitorFormModal
          open
          onClose={() => setMonitorForm(null)}
          projectId={id}
          monitor={monitorForm.monitor}
          onSaved={load}
        />
      )}
      {showSettings && project && (
        <ProjectFormModal open onClose={() => setShowSettings(false)} project={project} onSaved={load} />
      )}
      {showMembers && <ManageMembersModal open onClose={() => setShowMembers(false)} projectId={id} />}
    </div>
  )
}
