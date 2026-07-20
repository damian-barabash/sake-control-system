import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { AppShell } from '../components/AppShell'
import { StatusBadge, StatusDot, EmptyState, Spinner } from '../components/ui'
import { Sparkline } from '../components/Sparkline'
import { MonitorFormModal } from '../components/MonitorFormModal'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { ManageMembersModal } from '../components/ManageMembersModal'
import { checkNow } from '../lib/notify'
import { formatLatency, formatUptime, timeAgo, formatDuration } from '../lib/format'

function MonitorRow({ monitor, history, canManage, onEdit, onDelete, onReload }) {
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

  const canOpen = monitor.type === 'http' || monitor.type === 'keyword' || monitor.type === 'ssl'

  return (
    <div className="card p-4 sm:p-5">
      {/* header: status + name + sparkline */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusDot status={status} pulse />
            <h3 className="min-w-0 truncate font-semibold text-ink">{monitor.name}</h3>
            <span className="rounded-full border border-line bg-surface2 px-2 py-0.5 text-[10.5px] text-muted">
              {t('enum.mtype.' + monitor.type)}
            </span>
            {!monitor.enabled && <span className="rounded-full border border-down/30 bg-down/10 px-2 py-0.5 text-[10.5px] text-down">off</span>}
          </div>
          <a
            href={canOpen ? monitor.target : undefined}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block truncate text-[13px] text-faint hover:text-muted"
          >
            {monitor.target}
            {monitor.port ? `:${monitor.port}` : ''}
          </a>
        </div>

        <div className="hidden shrink-0 items-center gap-3 xs:flex">
          <Sparkline points={history} />
          <StatusBadge status={status} size="sm" />
        </div>
      </div>

      {/* sparkline on the narrowest screens drops to its own full-width row */}
      <div className="mt-3 flex items-center justify-between xs:hidden">
        <StatusBadge status={status} size="sm" />
        <Sparkline points={history} width={160} />
      </div>

      {/* metrics */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label={t('project.uptime')} value={formatUptime(st.uptime_24h)} />
        <Metric label={t('project.latency')} value={formatLatency(st.last_latency_ms)} />
        <Metric
          label={t('project.lastCheck')}
          value={st.last_checked_at ? timeAgo(st.last_checked_at) : t('project.never')}
        />
        {st.ssl_days_left != null ? (
          <Metric label="SSL" value={`${st.ssl_days_left} d`} warn={st.ssl_days_left <= (monitor.ssl_warn_days ?? 14)} />
        ) : (
          <span className="hidden sm:block" />
        )}
      </div>

      {st.last_error && status !== 'up' && (
        <p className="mt-3 break-all font-mono text-[12px] text-down/90">{st.last_error}</p>
      )}

      {/* actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-line/60 pt-3.5">
        <button
          onClick={runNow}
          disabled={checking}
          className="flex-1 rounded-xl border border-line px-3.5 py-2 text-center text-[12.5px] font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink disabled:opacity-50 sm:flex-none"
        >
          {checking ? t('project.checking') : t('project.runNow')}
        </button>
        {canManage && (
          <>
            <button
              onClick={() => onEdit(monitor)}
              className="shrink-0 rounded-xl border border-line px-3.5 py-2 text-[12.5px] font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
            >
              {t('common.edit')}
            </button>
            <button
              onClick={() => onDelete(monitor)}
              aria-label="delete"
              className="shrink-0 rounded-xl border border-line px-3.5 py-2 text-[12.5px] text-down/80 transition-colors hover:bg-down/10 hover:text-down"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, warn }) {
  return (
    <span className="flex flex-col rounded-xl border border-line bg-surface2/70 px-3 py-2.5">
      <span className="text-[10.5px] text-faint">{label}</span>
      <span className={`mt-0.5 font-mono text-[13px] ${warn ? 'text-degraded' : 'text-ink'}`}>{value}</span>
    </span>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isModerator, user } = useAuth()
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
  // Manage = moderator (sees all) or the owner of this project. RLS enforces the same.
  const canManage = isModerator || (project && project.created_by === user?.id)

  return (
    <AppShell crumb={t('topbar.projects')} title={project?.name ?? '…'}>
      {loading && !project ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-7 w-7" />
        </div>
      ) : !project ? (
        <EmptyState title="404" />
      ) : (
        <>
          <Link to="/app" className="text-[12.5px] text-faint transition-colors hover:text-ink">
            {t('project.back')}
          </Link>

          <div className="a-in mb-7 mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-[1.45rem] font-semibold tracking-tight">{project.name}</h1>
              {project.description && <p className="mt-1 text-sm text-faint">{project.description}</p>}
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
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
              {canManage && (
                <button className="btn-solid" onClick={() => setMonitorForm({ monitor: null })}>
                  + {t('project.addMonitor')}
                </button>
              )}
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {monitors.map((m, i) => (
                <div key={m.id} className="a-in" style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}>
                  <MonitorRow
                    monitor={m}
                    history={history[m.id] ?? []}
                    canManage={canManage}
                    onEdit={(mon) => setMonitorForm({ monitor: mon })}
                    onDelete={deleteMonitor}
                    onReload={load}
                  />
                </div>
              ))}
            </div>
          )}

          {/* incidents */}
          <div className="a-in mt-10" style={{ animationDelay: '260ms' }}>
            <h2 className="mb-3 text-[13px] font-semibold text-ink">{t('project.incidents')}</h2>
            {incidents.length === 0 ? (
              <p className="text-sm text-faint">{t('project.noIncidents')}</p>
            ) : (
              <div className="card divide-y divide-line overflow-hidden">
                {incidents.map((inc) => (
                  <div key={inc.id} className="flex items-center gap-3 px-4 py-3">
                    <StatusDot status={inc.status === 'open' ? 'down' : 'up'} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{monName(inc.monitor_id)}</span>
                    <span className="font-mono text-[12px] text-faint">
                      {inc.status === 'open'
                        ? t('project.downFor', { dur: formatDuration(inc.started_at) })
                        : t('project.resolvedIn', { dur: formatDuration(inc.started_at, inc.resolved_at) })}
                    </span>
                    <span className="hidden text-[11px] text-faint sm:block">{timeAgo(inc.started_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManage && (
            <div className="mt-12 border-t border-line pt-6">
              <button className="btn-danger" onClick={deleteProject}>
                {t('project.deleteProject')}
              </button>
            </div>
          )}
        </>
      )}

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
    </AppShell>
  )
}
