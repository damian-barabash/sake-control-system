import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { entitlement } from '../lib/billing'
import { openCheckout } from '../lib/paddle'
import { PlanButtons } from './PlanButtons'
import { Logo } from './Logo'

// Blocking overlays shown when access has lapsed:
//   admin  → "trial over" + pay buttons
//   member → "account inactive, contact the owner" + owner email
// Moderators are never gated. Only shown on panel routes (/account stays
// reachable so a lapsed user can still delete their account — Apple 5.1.1(v)).
export function BillingGate() {
  const { session, profile, role, isAdmin, isModerator, signOut } = useAuth()
  const { t } = useT()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [ownerBlockEmail, setOwnerBlockEmail] = useState(null)
  const [ownerChecked, setOwnerChecked] = useState(false)
  const [paying, setPaying] = useState(false)

  // Member gating: block only if EVERY owner of the member's projects has lapsed.
  useEffect(() => {
    if (role !== 'member') {
      setOwnerChecked(true)
      return
    }
    let alive = true
    ;(async () => {
      const { data: projs } = await supabase.from('projects').select('created_by')
      const ownerIds = [...new Set((projs ?? []).map((p) => p.created_by).filter(Boolean))]
      if (!ownerIds.length) {
        if (alive) { setOwnerBlockEmail(null); setOwnerChecked(true) }
        return
      }
      const { data: owners } = await supabase
        .from('profiles')
        .select('id, email, role, subscription_status, subscription_ends_at, trial_ends_at')
        .in('id', ownerIds)
      // Moderator-owned projects are never billed.
      const anyActive = (owners ?? []).some((o) => o.role === 'moderator' || entitlement(o).active)
      if (alive) {
        setOwnerBlockEmail(anyActive ? null : (owners ?? [])[0]?.email ?? null)
        setOwnerChecked(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [role, session?.user?.id])

  const onPanel = /^\/(app|project|users|inquiries)/.test(pathname)
  if (!session || isModerator || !onPanel) return null

  async function pay(plan) {
    setPaying(true)
    const r = await openCheckout({ email: profile?.email, profileId: profile?.id, plan })
    setPaying(false)
    if (!r.ok && r.reason === 'not_configured') alert(t('billing.notConfigured'))
  }

  // Admin whose trial ended and isn't paid.
  if (isAdmin) {
    const ent = entitlement(profile)
    if (ent.active) return null
    return (
      <Overlay>
        <Logo size={44} />
        <h2 className="mt-5 text-xl font-semibold text-ink">{t('billing.unpaidTitle')}</h2>
        <p className="mx-auto mt-2 max-w-[380px] text-sm text-muted">{t('billing.unpaidBody')}</p>
        <div className="mt-6">
          <PlanButtons onPick={pay} busy={paying} />
        </div>
        <GateFooter onSignOut={signOut} onAccount={() => navigate('/account')} t={t} />
      </Overlay>
    )
  }

  // Member whose owner(s) all lapsed.
  if (role === 'member') {
    if (!ownerChecked || !ownerBlockEmail) return null
    return (
      <Overlay>
        <Logo size={44} />
        <h2 className="mt-5 text-xl font-semibold text-ink">{t('billing.clientTitle')}</h2>
        <p className="mx-auto mt-2 max-w-[380px] text-sm text-muted">{t('billing.clientBody')}</p>
        <a href={`mailto:${ownerBlockEmail}`} className="mt-3 block text-sm text-accentText hover:underline">
          {ownerBlockEmail}
        </a>
        <GateFooter onSignOut={signOut} onAccount={() => navigate('/account')} t={t} />
      </Overlay>
    )
  }

  return null
}

// The gate covers the whole panel, so account deletion has to be reachable from
// inside it — otherwise a lapsed user could never delete their account (which
// Apple requires to be available in-app).
function GateFooter({ onSignOut, onAccount, t }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-4 text-[12px]">
      <button onClick={onSignOut} className="text-faint transition-colors hover:text-ink">
        {t('billing.signOut')}
      </button>
      <span className="text-faint">·</span>
      <button onClick={onAccount} className="text-faint transition-colors hover:text-down">
        {t('account.deleteCta')}
      </button>
    </div>
  )
}

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-bg/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[440px] rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        {children}
      </div>
    </div>
  )
}
