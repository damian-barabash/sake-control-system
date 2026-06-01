import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { Modal, Field, Toggle, Spinner } from './ui'

export function ProjectFormModal({ open, onClose, project, onSaved }) {
  const { t } = useT()
  const { user } = useAuth()
  const editing = !!project
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [notifyEmails, setNotifyEmails] = useState((project?.notify_emails ?? []).join(', '))
  const [alertMembers, setAlertMembers] = useState(project?.alert_members ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    const emails = notifyEmails
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      notify_emails: emails,
      alert_members: alertMembers,
    }
    try {
      const res = editing
        ? await supabase.from('projects').update(payload).eq('id', project.id).select().single()
        : await supabase.from('projects').insert({ ...payload, created_by: user.id }).select().single()
      if (res.error) {
        setError(res.error.message)
        return
      }
      onSaved?.(res.data)
      onClose()
    } catch (e) {
      setError(String(e?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('projectForm.editTitle') : t('projectForm.newTitle')}>
      <form onSubmit={submit} className="space-y-5">
        <Field label={t('projectForm.name')}>
          <input className="field-box" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label={t('projectForm.description')}>
          <input className="field-box" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label={t('projectForm.notifyEmails')} hint={t('projectForm.notifyEmailsHint')}>
          <input
            className="field-box"
            value={notifyEmails}
            onChange={(e) => setNotifyEmails(e.target.value)}
            placeholder="alerts@example.com, ops@example.com"
          />
        </Field>
        <Toggle checked={alertMembers} onChange={setAlertMembers} label={t('projectForm.alertMembers')} />

        {error && <p className="text-down text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-solid" disabled={busy}>
            {busy ? <Spinner /> : editing ? t('common.save') : t('common.create')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
