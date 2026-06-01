import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { Logo } from './Logo'
import { LangSwitch } from './LangSwitch'

export function TopBar() {
  const { profile, user, isAdmin, signOut } = useAuth()
  const { t } = useT()
  const name = profile?.full_name || profile?.email || user?.email

  const navCls = ({ isActive }) =>
    `font-mono uppercase tracking-label text-[10px] px-1 pb-1 border-b transition-colors ${
      isActive ? 'text-ink border-accent' : 'text-muted border-transparent hover:text-ink'
    }`

  return (
    <header className="border-b border-line bg-surface/70 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <NavLink to="/app" className="flex items-center gap-2.5 shrink-0">
            <Logo size={26} />
            <span className="font-semibold tracking-tight hidden sm:block">Sake Control</span>
            {isAdmin && (
              <span className="font-mono uppercase tracking-label text-[9px] text-accent border border-accent/40 rounded px-1.5 py-0.5">
                {t('topbar.admin')}
              </span>
            )}
          </NavLink>
          <nav className="flex items-center gap-4">
            <NavLink to="/app" end className={navCls}>
              {t('topbar.projects')}
            </NavLink>
            {isAdmin && (
              <NavLink to="/users" className={navCls}>
                {t('topbar.users')}
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LangSwitch className="hidden sm:flex" />
          <span className="hidden md:block text-[0.8rem] text-muted max-w-[160px] truncate">{name}</span>
          <button
            onClick={signOut}
            className="font-mono uppercase tracking-label text-[10px] text-muted hover:text-ink transition-colors border border-line rounded-md px-2.5 py-1.5"
          >
            {t('topbar.signout')}
          </button>
        </div>
      </div>
    </header>
  )
}
