import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useT } from '../context/LangContext'
import { Spinner } from '../components/ui'
import { LangSwitch } from '../components/LangSwitch'

// Open self-registration → creates an ADMIN (own isolated workspace). The handle_new_user
// trigger clamps signup metadata to admin|member, so 'moderator' can never be self-minted.
export default function Register() {
  const { t, lang } = useT()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError(t('register.errMismatch'))
    if (password.length < 6) return setError(t('register.errWeak'))
    setBusy(true)
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() || null, role: 'admin' } },
    })
    if (err) {
      setBusy(false)
      if (/already|registered|exists/i.test(err.message)) return setError(t('register.errExists'))
      return setError(t('register.errGeneric') + err.message)
    }
    // Persist the chosen UI language on the fresh profile (default would be 'ru').
    if (data.user?.id) {
      supabase.from('profiles').update({ language: lang }).eq('id', data.user.id)
    }
    setBusy(false)
    if (data.session) {
      navigate('/app', { replace: true })
    } else {
      setNeedsConfirm(true)
    }
  }

  return (
    <div className="min-h-screen dotgrid flex flex-col">
      <div className="flex items-center justify-between p-5">
        <button onClick={() => navigate('/')} className="label hover:text-ink transition-colors">
          {t('register.toLanding')}
        </button>
        <LangSwitch />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 pb-20">
        <div className="w-full max-w-[420px]">
          <div className="flex flex-col items-center text-center mb-8">
            <img
              src="./logo.png"
              alt="Sake"
              className="h-14 w-14 mb-4 drop-shadow-[0_6px_22px_rgba(52,199,127,0.28)]"
            />
            <span className="label">{t('register.badge')}</span>
            <h1 className="mt-2 text-[1.4rem] font-semibold tracking-tight text-ink">{t('register.title')}</h1>
            <p className="mt-2 text-sm text-faint">{t('register.sub')}</p>
          </div>

          {needsConfirm ? (
            <div className="brackets relative card px-7 py-9 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accentSoft text-accent">
                ✓
              </div>
              <h2 className="text-lg font-medium text-ink">{t('register.successTitle')}</h2>
              <p className="mt-2 text-sm text-faint">{t('register.checkEmail')}</p>
              <button onClick={() => navigate('/login')} className="btn-solid w-full mt-6 py-3">
                {t('register.successCta')}
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="brackets relative card p-7">
              <div className="mb-5">
                <label className="label block mb-2">{t('register.name')}</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('register.namePlaceholder')}
                  className="field-box"
                />
              </div>

              <div className="mb-5">
                <label className="label block mb-2">{t('register.email')}</label>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="field-box"
                />
              </div>

              <div className="mb-1.5">
                <label className="label block mb-2">{t('register.password')}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="field-box"
                />
              </div>
              <p className="mb-4 text-[11px] text-faint">{t('register.passwordHint')}</p>

              <div className="mb-6">
                <label className="label block mb-2">{t('register.confirm')}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="field-box"
                />
              </div>

              {error && (
                <div className="mb-4 text-[0.85rem] text-down bg-down/10 border border-down/25 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button type="submit" disabled={busy} className="btn-solid w-full py-3">
                {busy ? <Spinner className="border-bg/40 border-t-bg" /> : t('register.submit')}
              </button>

              <p className="mt-5 text-center text-xs text-faint">
                {t('register.haveAccount')}{' '}
                <button type="button" onClick={() => navigate('/login')} className="text-ink underline-offset-2 hover:underline">
                  {t('register.signin')}
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
