import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { entitlement } from '../lib/billing'
import { formatDay } from '../lib/format'
import { AppShell } from '../components/AppShell'
import { BillingModal } from '../components/BillingModal'
import { Logo } from '../components/Logo'
import { Avatar, Spinner } from '../components/ui'

// Account page: who you are, your subscription, and account deletion.
// Deleting is required by App Store guideline 5.1.1(v) — it has to be reachable
// in-app, not only by emailing support — so the same screen exists in the apps.
export default function Account() {
  const { profile, role, isAdmin, isModerator, signOut } = useAuth()
  const { t } = useT()
  const navigate = useNavigate()

  const [showBilling, setShowBilling] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ent = entitlement(profile)
  const statusLabel =
    ent.state === 'active' ? t('billing.statusActive') : ent.state === 'trial' ? t('billing.statusTrial') : t('billing.statusInactive')
  const statusColor = ent.state === 'active' ? '#34C77F' : ent.state === 'trial' ? '#E3B341' : '#8A968F'

  const emailMatches = confirm.trim().toLowerCase() === String(profile?.email ?? '').trim().toLowerCase()

  async function remove() {
    if (!emailMatches || busy) return
    if (!confirm.length || !window.confirm(t('account.deleteConfirm'))) return
    setBusy(true)
    setError('')
    try {
      const { data, error: err } = await supabase.functions.invoke('delete-account', {
        body: { confirm_email: profile.email },
      })
      // supabase-js puts the error body on error.context — read the real reason.
      const detail = data?.error ?? (err ? await err.context?.json?.().then((b) => b?.error).catch(() => null) : null)
      if (err || detail) throw new Error(detail || err.message)
      await signOut()
      navigate('/', { replace: true })
    } catch (e) {
      setError(String(e.message) === 'moderator_self_delete' ? t('account.deleteModerator') : t('account.deleteError'))
      setBusy(false)
    }
  }

  return (
    <AppShell title={t('account.title')}>
      <div className="mx-auto max-w-[720px]">
        <h1 className="a-in font-display text-[1.45rem] font-semibold tracking-tight">{t('account.heading')}</h1>

        {/* Identity */}
        <section className="card a-in mt-6 p-6" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-4">
            <Avatar name={profile?.full_name} email={profile?.email} size={44} />
            <div className="min-w-0">
              <div className="truncate text-base text-ink">{profile?.full_name || profile?.email}</div>
              <div className="mt-1 truncate text-sm text-muted">{profile?.email}</div>
              {role && <div className="mt-2 text-[11px] text-faint">{t('admin.roles.' + role)}</div>}
            </div>
          </div>
        </section>

        {/* Subscription (tenant admins only — moderators aren't billed, members inherit) */}
        {isAdmin && (
          <section className="card a-in mt-4 p-6" style={{ animationDelay: '120ms' }}>
            <p className="label">{t('billing.manage')}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: statusColor }} />
                  <span className="text-sm text-ink">{statusLabel}</span>
                </div>
                <p className="mt-1 text-xs text-faint">
                  {ent.state === 'active'
                    ? profile?.subscription_ends_at
                      ? t('billing.activeUntil', { date: formatDay(profile.subscription_ends_at) })
                      : ''
                    : ent.state === 'trial'
                    ? t('billing.trialUntil', { n: ent.daysLeft })
                    : ''}
                </p>
              </div>
              <button onClick={() => setShowBilling(true)} className="btn-solid">
                {t('billing.modalTitle')}
              </button>
            </div>
          </section>
        )}

        {/* Danger zone */}
        <section className="a-in mt-4 rounded-2xl border border-down/40 bg-down/5 p-6" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center gap-3">
            <Logo size={22} />
            <p className="label text-down">{t('account.dangerLabel')}</p>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-ink">{t('account.deleteTitle')}</h2>
          <p className="mt-2 text-sm text-muted">{t('account.deleteBody')}</p>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            <li>— {t('account.deleteItem1')}</li>
            <li>— {t('account.deleteItem2')}</li>
            <li>— {t('account.deleteItem3')}</li>
          </ul>

          {isModerator ? (
            <p className="mt-5 text-sm text-faint">{t('account.deleteModerator')}</p>
          ) : (
            <>
              <label className="label mt-6 block" htmlFor="confirm-email">
                {t('account.deleteConfirmLabel', { email: profile?.email ?? '' })}
              </label>
              <input
                id="confirm-email"
                type="email"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                placeholder={profile?.email ?? ''}
                className="field-box mt-2 w-full max-w-[360px]"
              />
              {error && <p className="mt-3 text-sm text-down">{error}</p>}
              <button
                onClick={remove}
                disabled={!emailMatches || busy}
                className="btn-danger mt-5"
              >
                {busy ? <Spinner /> : t('account.deleteCta')}
              </button>
            </>
          )}
        </section>
      </div>

      <BillingModal open={showBilling} onClose={() => setShowBilling(false)} />
    </AppShell>
  )
}
