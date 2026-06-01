import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { TopBar } from '../components/TopBar'
import { Modal, Field, Avatar, Spinner, EmptyState } from '../components/ui'

function CreateUserModal({ open, onClose, projects, onCreated }) {
  const { t } = useT()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
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
        project_ids: [...picked],
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
  const { user } = useAuth()
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

  async function removeUser(u) {
    if (!confirm(t('admin.deleteConfirm', { email: u.email }))) return
    await supabase.functions.invoke('create-user', { body: { action: 'delete', user_id: u.id } })
    load()
  }

  async function resetPw(u) {
    const pw = prompt(t('admin.newPassword'))
    if (!pw) return
    await supabase.functions.invoke('create-user', { body: { action: 'update_password', user_id: u.id, password: pw } })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-9">
        <div className="flex items-center justify-between mb-7">
          <h1 className="text-xl font-semibold tracking-tight">{t('admin.title')}</h1>
          <button className="btn-solid" onClick={() => setShowCreate(true)}>
            + {t('admin.newUser')}
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {users.map((u) => (
              <div key={u.id} className="card flex items-center gap-4 px-4 py-3.5">
                <Avatar name={u.full_name} email={u.email} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink truncate">{u.full_name || u.email}</span>
                    <span
                      className={`label-sm ${u.role === 'admin' ? 'text-accent' : 'text-faint'}`}
                    >
                      {t('admin.roles.' + u.role)}
                    </span>
                    {u.id === user.id && <span className="label-sm">({t('admin.you')})</span>}
                  </div>
                  <div className="text-[12px] text-faint truncate">
                    {u.full_name ? u.email + ' · ' : ''}
                    {(memberships[u.id] ?? []).join(', ') || (u.role === 'admin' ? '—' : t('common.none'))}
                  </div>
                </div>
                {u.role !== 'admin' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => resetPw(u)}
                      className="font-mono uppercase tracking-label text-[9px] text-muted hover:text-ink border border-line rounded px-2 py-1 transition-colors"
                    >
                      {t('admin.resetPassword')}
                    </button>
                    <button
                      onClick={() => removeUser(u)}
                      className="font-mono uppercase tracking-label text-[9px] text-down/80 hover:text-down border border-line rounded px-2 py-1 transition-colors"
                    >
                      {t('admin.delete')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateUserModal open onClose={() => setShowCreate(false)} projects={projects} onCreated={load} />
      )}
    </div>
  )
}
