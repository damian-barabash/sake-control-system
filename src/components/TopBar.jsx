import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { Logo } from './Logo'
import { LangSwitch } from './LangSwitch'
import { ThemeToggle } from './ThemeToggle'

export function TopBar() {
  const { profile, user, isStaff, role, signOut } = useAuth()
  const { t } = useT()
  const name = profile?.full_name || profile?.email || user?.email
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile menu on route change.
  useEffect(() => setMenuOpen(false), [location.pathname])

  // Close on Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const navCls = ({ isActive }) =>
    `font-mono uppercase tracking-label text-[10px] px-1 pb-1 border-b transition-colors ${
      isActive ? 'text-ink border-accent' : 'text-muted border-transparent hover:text-ink'
    }`

  const sheetNavCls = ({ isActive }) =>
    `font-mono uppercase tracking-label text-[11px] px-3 py-2.5 rounded-md transition-colors ${
      isActive ? 'text-ink bg-accent/10 border border-accent/40' : 'text-muted hover:text-ink hover:bg-line/40'
    }`

  return (
    <header className="border-b border-line bg-surface/70 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <NavLink to="/app" className="flex items-center gap-2.5 shrink-0">
            <Logo size={26} />
            <span className="font-semibold tracking-tight hidden sm:block">Sake Control</span>
            {isStaff && (
              <span className="font-mono uppercase tracking-label text-[9px] text-accent border border-accent/40 rounded px-1.5 py-0.5">
                {t('admin.roles.' + role)}
              </span>
            )}
          </NavLink>
          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-4">
            <NavLink to="/app" end className={navCls}>
              {t('topbar.projects')}
            </NavLink>
            {isStaff && (
              <NavLink to="/users" className={navCls}>
                {t('topbar.users')}
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Theme + language stay in the bar on every breakpoint */}
          <ThemeToggle />
          <LangSwitch />
          {/* Desktop-only identity + sign out */}
          <span className="hidden md:block text-[0.8rem] text-muted max-w-[160px] truncate">{name}</span>
          <button
            onClick={signOut}
            className="hidden sm:inline-block font-mono uppercase tracking-label text-[10px] text-muted hover:text-ink transition-colors border border-line rounded-md px-2.5 py-1.5"
          >
            {t('topbar.signout')}
          </button>
          {/* Mobile burger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t('topbar.menu')}
            aria-expanded={menuOpen}
            className="sm:hidden text-muted hover:text-ink transition-colors border border-line rounded-md p-1.5"
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown sheet */}
      {menuOpen && (
        <>
          <div className="sm:hidden fixed inset-0 top-14 z-10 bg-bg/40" onClick={() => setMenuOpen(false)} />
          <div className="sm:hidden relative z-20 border-t border-line bg-surface/95 backdrop-blur">
            <nav className="max-w-6xl mx-auto px-5 py-3 flex flex-col gap-1.5">
              {name && (
                <span className="px-3 pb-1 text-[0.8rem] text-muted truncate">{name}</span>
              )}
              <NavLink to="/app" end className={sheetNavCls}>
                {t('topbar.projects')}
              </NavLink>
              {isStaff && (
                <NavLink to="/users" className={sheetNavCls}>
                  {t('topbar.users')}
                </NavLink>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false)
                  signOut()
                }}
                className="mt-1 text-left font-mono uppercase tracking-label text-[11px] text-muted hover:text-ink transition-colors border border-line rounded-md px-3 py-2.5"
              >
                {t('topbar.signout')}
              </button>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
