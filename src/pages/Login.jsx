import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { LangSwitch } from '../components/LangSwitch'

export default function Login() {
  const { signIn } = useAuth()
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    const err = await signIn(email, password)
    setBusy(false)
    if (err) {
      setError(err.message === 'Invalid login credentials' ? t('login.errInvalid') : err.message || t('login.errGeneric'))
    }
  }

  return (
    <div className="min-h-screen dotgrid flex flex-col">
      <div className="flex justify-end p-5">
        <LangSwitch />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 pb-20">
        <div className="w-full max-w-[400px]">
          <div className="flex flex-col items-center mb-9">
            <img
              src="./logo.png"
              alt="Sake"
              className="h-16 w-16 mb-4 drop-shadow-[0_6px_22px_rgba(52,199,127,0.28)]"
            />
            <h1 className="text-[1.4rem] font-semibold tracking-tight text-ink">Sake Control System</h1>
            <p className="label mt-2 text-muted">{t('login.tagline')}</p>
          </div>

          <form onSubmit={onSubmit} className="brackets relative card p-7">
            <div className="mb-5">
              <label className="label block mb-2">{t('common.email')}</label>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="office@barabashflow.pl"
                className="field-box"
              />
            </div>

            <div className="mb-6">
              <label className="label block mb-2">{t('common.password')}</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              {busy ? t('login.signingIn') : t('login.submit')}
            </button>
          </form>

          <p className="text-center label mt-6 text-faint">{t('login.hint')}</p>
        </div>
      </div>
    </div>
  )
}
