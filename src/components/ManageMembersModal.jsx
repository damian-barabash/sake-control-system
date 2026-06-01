import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../context/LangContext'
import { Modal, Avatar, Spinner } from './ui'

// Admin-only: pick which member accounts can access this project.
export function ManageMembersModal({ open, onClose, projectId }) {
  const { t } = useT()
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    ;(async () => {
      const [{ data: profs }, { data: members }] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, role').neq('role', 'admin').order('email'),
        supabase.from('project_members').select('user_id').eq('project_id', projectId),
      ])
      if (!active) return
      setUsers(profs ?? [])
      setSelected(new Set((members ?? []).map((m) => m.user_id)))
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [open, projectId])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    // Replace the membership set: delete all, re-insert selected.
    await supabase.from('project_members').delete().eq('project_id', projectId)
    const rows = [...selected].map((uid) => ({ project_id: projectId, user_id: uid }))
    if (rows.length) await supabase.from('project_members').insert(rows)
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('members.title')}>
      <p className="text-sm text-faint mb-4">{t('members.hint')}</p>
      {loading ? (
        <div className="py-10 flex justify-center">
          <Spinner />
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">{t('members.noUsers')}</p>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto -mx-1 px-1">
          {users.map((u) => {
            const on = selected.has(u.id)
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  on ? 'border-accent/50 bg-accentSoft' : 'border-line hover:bg-surface2'
                }`}
              >
                <Avatar name={u.full_name} email={u.email} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink truncate">{u.full_name || u.email}</span>
                  {u.full_name && <span className="block text-[11px] text-faint truncate">{u.email}</span>}
                </span>
                <span
                  className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${
                    on ? 'bg-accent border-accent text-bg' : 'border-line2'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <div className="flex justify-end gap-3 pt-6">
        <button type="button" className="btn-ghost" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button type="button" className="btn-solid" onClick={save} disabled={saving || loading}>
          {saving ? <Spinner /> : t('common.save')}
        </button>
      </div>
    </Modal>
  )
}
