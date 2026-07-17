import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { AppShell } from '../components/AppShell'
import { Modal, Field, Avatar, Spinner } from '../components/ui'

// Roles a moderator may grant. Admins always create clients ('member').
const ASSIGNABLE = ['member', 'admin', 'moderator']

function CreateUserModal({ open, onClose, projects, onCreated, isModerator }) {
  const { t } = useT()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'member' })
  const [picked, setPicked] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  function toggle(pid) {
    setPicked((prev) => {
      const n = new Set(prev)
      n.has(pid) ? n.delete(pid) : n.add(pid)
      return n
    })
  }

  // Project assignment only matters for clients; staff see projects by ownership/role.
  const showProjects = form.role === 'member'

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    const { data, error: err } = await supabase.functions.invoke('create-user', {
      body: {
        action: 'create',
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim() || null,
        role: isModerator ? form.role : 'member',
        project_ids: showProjects ? [...picked] : [],
      },
    })
    setBusy(false)
    if (err || data?.error) {
      setError(data?.error || err.message)
      return
    }
    onCreated()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('admin.newUser')}>
      <form onSubmit={submit} className="space-y-5">
        <Field label={t('admin.fullName')}>
          <input className="field-box" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
        </Field>
        <Field label={t('admin.email')}>
          <input className="field-box" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </Field>
        <Field label={t('admin.password')}>
          <input className="field-box" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} />
        </Field>

        {isModerator && (
          <Field label={t('admin.role')} hint={t('admin.roleHint')}>
            <div className="flex flex-wrap gap-2">
              {ASSIGNABLE.map((r) => {
                const on = form.role === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set('role', r)}
                    className={`rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
                      on ? 'border-accent/50 bg-accentSoft text-ink' : 'border-line text-muted hover:text-ink'
                    }`}
                  >
                    {t('admin.roles.' + r)}
                  </button>
                )
              })}
            </div>
          </Field>
        )}

        {showProjects && (
          <div>
            <span className="label block mb-2">{t('admin.assign')}</span>
            {projects.length === 0 ? (
              <p className="text-sm text-faint">{t('common.none')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => {
                  const on = picked.has(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={`rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
                        on ? 'border-accent/50 bg-accentSoft text-ink' : 'border-line text-muted hover:text-ink'
                      }`}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-down text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-solid" disabled={busy}>
            {busy ? <Spinner /> : t('admin.create')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminUsers() {
  const { user, isModerator } = useAuth()
  const { t } = useT()
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [memberships, setMemberships] = useState({}) // user_id -> [project names]
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    const [{ data: profs }, { data: projs }, { data: pm }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role, alert_email').order('created_at'),
      supabase.from('projects').select('id, name').order('name'),
      supabase.from('project_members').select('user_id, projects(name)'),
    ])
    const map = {}
    for (const row of pm ?? []) {
      ;(map[row.user_id] ??= []).push(row.projects?.name)
    }
    setUsers(profs ?? [])
    setProjects(projs ?? [])
    setMemberships(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Whom can the current staff member act on? Moderator: everyone but self.
  // Admin: only clients (members) — the Edge Function re-checks ownership.
  function canManageUser(u) {
    if (u.id === user.id) return false
    return isModerator || u.role === 'member'
  }

  async function removeUser(u) {
    if (!confirm(t('admin.deleteConfirm', { email: u.email }))) return
    const { data } = await supabase.functions.invoke('create-user', { body: { action: 'delete', user_id: u.id } })
    if (data?.error) alert(data.error)
    load()
  }

  async function resetPw(u) {
    const pw = prompt(t('admin.newPassword'))
    if (!pw) return
    const { data } = await supabase.functions.invoke('create-user', { body: { action: 'update_password', user_id: u.id, password: pw } })
    if (data?.error) alert(data.error)
  }

  return (
    <AppShell
      title={t('admin.title')}
      actions={
        <button className="btn-solid !py-2 hidden sm:inline-flex" onClick={() => setShowCreate(true)}>
          + {t('admin.newUser')}
        </button>
      }
    >
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <h1 className="font-display text-[1.45rem] font-semibold tracking-tight">{t('admin.title')}</h1>
          <button className="btn-solid sm:hidden" onClick={() => setShowCreate(true)}>
            + {t('admin.newUser')}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {users.map((u) => {
              const isStaffRole = u.role === 'admin' || u.role === 'moderator'
              return (
                <div key={u.id} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface2/60">
                  <Avatar name={u.full_name} email={u.email} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">{u.full_name || u.email}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          isStaffRole
                            ? 'border-accent/40 bg-accent/10 text-accentText'
                            : 'border-line bg-surface2 text-faint'
                        }`}
                      >
                        {t('admin.roles.' + u.role)}
                      </span>
                      {u.id === user.id && <span className="text-[10.5px] text-faint">({t('admin.you')})</span>}
                    </div>
                    <div className="truncate text-[12px] text-faint">
                      {u.full_name ? u.email + ' · ' : ''}
                      {(memberships[u.id] ?? []).join(', ') || (isStaffRole ? '—' : t('common.none'))}
                    </div>
                  </div>
                  {canManageUser(u) && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => resetPw(u)}
                        className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
                      >
                        {t('admin.resetPassword')}
                      </button>
                      <button
                        onClick={() => removeUser(u)}
                        className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-down/80 transition-colors hover:bg-down/10 hover:text-down"
                      >
                        {t('admin.delete')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          open
          onClose={() => setShowCreate(false)}
          projects={projects}
          onCreated={load}
          isModerator={isModerator}
        />
      )}
    </AppShell>
  )
}
