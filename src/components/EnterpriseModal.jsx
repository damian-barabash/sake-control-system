import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../context/LangContext'
import { Modal, Field, Spinner } from './ui'

// Public inquiry form for the Enterprise plan. Anyone (unauthenticated landing
// visitor) can submit; the row lands in `enterprise_inquiries` and is readable
// only by moderators (RLS). No auth required — uses the anon publishable key.
export function EnterpriseModal({ open, onClose }) {
  const { t } = useT()
  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', message: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!emailOk) {
      setError(t('landing.enterpriseForm.emailInvalid'))
      return
    }
    setBusy(true)
    try {
      const { error: err } = await supabase.from('enterprise_inquiries').insert({
        company: form.company.trim() || null,
        name: form.name.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        message: form.message.trim() || null,
      })
      if (err) throw new Error(err.message)
      setDone(true)
    } catch {
      setError(t('landing.enterpriseForm.error'))
    } finally {
      setBusy(false)
    }
  }

  function handleClose() {
    // Reset so a re-open starts clean.
    setForm({ company: '', name: '', email: '', phone: '', message: '' })
    setError('')
    setDone(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('landing.enterpriseForm.title')}>
      {done ? (
        <div className="py-4 text-center">
          <img src="./logo.png" alt="" className="mx-auto mb-4 h-12 w-12 lp-float" />
          <h3 className="text-lg font-semibold text-ink">{t('landing.enterpriseForm.successTitle')}</h3>
          <p className="mx-auto mt-2 max-w-[360px] text-sm text-muted">{t('landing.enterpriseForm.successBody')}</p>
          <button onClick={handleClose} className="btn-solid mt-6">
            {t('landing.enterpriseForm.close')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <p className="text-sm text-faint">{t('landing.enterpriseForm.sub')}</p>

          <Field label={t('landing.enterpriseForm.company')}>
            <input
              className="field-box"
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
              placeholder={t('landing.enterpriseForm.companyPlaceholder')}
            />
          </Field>
          <Field label={t('landing.enterpriseForm.name')}>
            <input
              className="field-box"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('landing.enterpriseForm.namePlaceholder')}
            />
          </Field>
          <Field label={t('landing.enterpriseForm.email')}>
            <input
              className="field-box"
              type="email"
              required
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@company.com"
            />
          </Field>
          <Field label={`${t('landing.enterpriseForm.phone')} · ${t('landing.enterpriseForm.phoneOptional')}`}>
            <input className="field-box" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+48…" />
          </Field>
          <Field label={t('landing.enterpriseForm.message')}>
            <textarea
              className="field-box resize-y"
              rows={4}
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder={t('landing.enterpriseForm.messagePlaceholder')}
            />
          </Field>

          {error && (
            <div className="rounded-xl border border-down/40 bg-down/10 px-3.5 py-2.5 text-[13px] text-down">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={handleClose} className="btn-ghost">
              {t('landing.enterpriseForm.close')}
            </button>
            <button type="submit" disabled={busy || !form.email.trim()} className="btn-solid">
              {busy ? <Spinner /> : t('landing.enterpriseForm.submit')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
