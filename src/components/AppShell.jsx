import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LangContext'
import { Logo } from './Logo'
import { LangSwitch } from './LangSwitch'
import { ThemeToggle } from './ThemeToggle'
import { Avatar } from './ui'

/* lucide-style line icons */
const PATHS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  users: 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
}
export function Ico({ name, className = 'h-[18px] w-[18px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  )
}

function NavItem({ to, end, icon, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-colors ${
          isActive
            ? 'bg-accent text-[#06140d] shadow-[0_10px_26px_-10px_rgba(52,199,127,0.65)]'
            : 'text-muted hover:bg-surface2 hover:text-ink'
        }`
      }
    >
      <Ico name={icon} />
      <span className="truncate">{children}</span>
    </NavLink>
  )
}

function SidebarContent({ onNavigate }) {
  const { profile, user, isStaff, isModerator, role, signOut } = useAuth()
  const { t } = useT()
  const name = profile?.full_name || profile?.email || user?.email

  return (
    <div className="flex h-full flex-col">
      {/* identity */}
      <div className="flex items-center gap-3 px-4 pb-5 pt-6">
        <Avatar name={profile?.full_name} email={profile?.email || user?.email} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-ink">{name}</div>
          {role && <div className="mt-0.5 text-[11px] text-faint">{t('admin.roles.' + role)}</div>}
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 space-y-1 px-3" onClick={onNavigate}>
        <div className="label px-1.5 pb-2 pt-1">{t('topbar.menu')}</div>
        <NavItem to="/app" end icon="grid">{t('topbar.projects')}</NavItem>
        {isStaff && <NavItem to="/users" icon="users">{t('topbar.users')}</NavItem>}
        {isModerator && <NavItem to="/inquiries" icon="inbox">{t('topbar.inquiries')}</NavItem>}
      </nav>

      {/* footer controls */}
      <div className="space-y-3 border-t border-line px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <ThemeToggle />
          <LangSwitch />
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
        >
          <Ico name="logout" />
          {t('topbar.signout')}
        </button>
        <div className="flex items-center gap-2 px-1 pt-1">
          <Logo size={20} />
          <span className="text-[11.5px] font-semibold tracking-tight text-faint">Sake Control</span>
        </div>
      </div>
    </div>
  )
}

/* Panel chrome: fixed sidebar on desktop, top bar + slide-in drawer on mobile.
   `title` renders in the top bar breadcrumb; `crumb` (optional) prefixes it. */
export function AppShell({ title, crumb, actions, children, wide = false }) {
  const { profile, user, isStaff, role } = useAuth()
  const { t } = useT()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()

  useEffect(() => setDrawer(false), [location.pathname])
  useEffect(() => {
    if (!drawer) return
    const onKey = (e) => e.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="min-h-screen lg:pl-64">
      {/* ambient brand glow behind everything */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(52% 38% at 72% 0%, rgba(52,199,127,0.09) 0%, rgba(52,199,127,0) 70%)' }}
      />

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface/80 backdrop-blur lg:block">
        <SidebarContent />
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <>
          <div className="fade-in fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} />
          <aside className="drawer-in fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-surface shadow-2xl lg:hidden">
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </aside>
        </>
      )}

      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
        <div className={`mx-auto flex h-14 items-center gap-3 px-4 sm:px-6 ${wide ? '' : 'max-w-6xl'}`}>
          {/* burger (mobile) */}
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label={t('topbar.menu')}
            className="rounded-lg border border-line p-2 text-muted transition-colors hover:text-ink lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>

          {/* breadcrumb */}
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
            <span className="hidden items-center gap-2 text-faint sm:flex">
              <Logo size={18} />
              <span>Sake Control</span>
              <span className="text-line2">/</span>
            </span>
            {crumb && (
              <>
                <span className="hidden truncate text-faint sm:block">{crumb}</span>
                <span className="hidden text-line2 sm:block">/</span>
              </>
            )}
            <span className="truncate font-medium text-ink">{title}</span>
          </div>

          {/* actions + identity */}
          <div className="flex shrink-0 items-center gap-2.5">
            {actions}
            {isStaff && (
              <span className="hidden rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[10.5px] font-medium text-accentText md:block">
                {t('admin.roles.' + role)}
              </span>
            )}
            <span className="hidden lg:block">
              <Avatar name={profile?.full_name} email={profile?.email || user?.email} size={30} />
            </span>
          </div>
        </div>
      </header>

      {/* keyed by route so navigation gets a soft content fade */}
      <main key={location.pathname} className={`page-in relative z-10 mx-auto w-full px-4 py-7 sm:px-6 sm:py-8 ${wide ? '' : 'max-w-6xl'}`}>
        {children}
      </main>
    </div>
  )
}
