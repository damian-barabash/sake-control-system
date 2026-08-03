import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { entitlement } from '../lib/billing'
import { openCheckout } from '../lib/paddle'
import { PlanButtons } from './PlanButtons'
import { formatDay } from '../lib/format'
import { Modal, Spinner } from './ui'

// Admin subscription management: shows status, lets them subscribe or cancel.
// Cancel goes through the paddle-cancel Edge Function (secret key stays server-side).
export function BillingModal({ open, onClose }) {
  const { profile, refreshProfile } = useAuth()
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const ent = entitlement(profile)
  const endDate = profile?.subscription_ends_at ? formatDay(profile.subscription_ends_at) : ''
  const canCancel = ent.state === 'active' && !!profile?.paddle_subscription_id

  async function pay(plan) {
    setError('')
    const r = await openCheckout({ email: profile?.email, profileId: profile?.id, plan })
    if (!r.ok && r.reason === 'not_configured') setError(t('billing.notConfigured'))
  }

  async function cancel() {
    if (!confirm(t('billing.cancelConfirm'))) return
    setBusy(true)
    setError('')
    try {
      const { data, error: err } = await supabase.functions.invoke('paddle-cancel', { body: { action: 'cancel_self' } })
      if (err || data?.error) throw new Error(err?.message || data?.error)
      setMsg(t('billing.cancelDone', { date: endDate || '—' }))
      setTimeout(() => refreshProfile?.(), 1500)
    } catch {
      setError(t('billing.cancelError'))
    } finally {
      setBusy(false)
    }
  }

  const statusLabel =
    ent.state === 'active' ? t('billing.statusActive') : ent.state === 'trial' ? t('billing.statusTrial') : t('billing.statusInactive')
  const dotColor = ent.state === 'active' ? '#34C77F' : ent.state === 'trial' ? '#E3B341' : '#8A968F'
  const sub =
    ent.state === 'active'
      ? endDate && t('billing.activeUntil', { date: endDate })
      : ent.state === 'trial'
      ? t('billing.trialUntil', { n: ent.daysLeft })
      : ''

  return (
    <Modal open={open} onClose={onClose} title={t('billing.modalTitle')}>
      <div className="mb-6 rounded-xl border border-line bg-surface2 p-5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: dotColor }} />
          <span className="text-sm font-medium text-ink">{statusLabel}</span>
        </div>
        {sub && <p className="mt-1.5 text-xs text-faint">{sub}</p>}
        <p className="mt-3 text-[11px] text-faint">{t('billing.payNote')}</p>
      </div>

      {msg && <div className="mb-5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accentText">{msg}</div>}
      {error && <div className="mb-5 rounded-lg border border-down/40 bg-down/10 px-3 py-2 text-xs text-down">{error}</div>}

      {ent.state !== 'active' && !msg && (
        <div className="mb-6">
          <PlanButtons onPick={pay} busy={busy} />
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-ghost">
          {t('common.close')}
        </button>
        {canCancel && (
          <button onClick={cancel} disabled={busy || !!msg} className="btn-danger">
            {busy ? <Spinner /> : t('billing.cancelBtn')}
          </button>
        )}
      </div>
    </Modal>
  )
}
