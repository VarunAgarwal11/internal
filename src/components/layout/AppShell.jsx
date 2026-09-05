import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { routeTransition } from '../../utils/motion'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import { KINDS } from '../../config/kinds'

// The whole of this app's navigation, in one list. Each entry names the permission that
// reveals it, so a role built in the role editor changes the sidebar with no code change;
// an entry with no permission is visible to every signed-in user.
//
// The partner rows come from KINDS (insertion order), because a kind's path, label,
// icon and f"{kind}:read" permission are already stated there — a fourth kind is a table
// entry and a route, never a nav edit. Administration stays literal: two one-off pages
// with nothing to derive them from.
// Dashboard is gated on the account role rather than a permission — it is the cross-area
// overview, so superadmin and admin only. Its tiles are still filtered by `permission`.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid', adminOnly: true },
  ...Object.entries(KINDS).map(([kind, { path, plural, icon }]) => ({
    to: path,
    label: plural,
    permission: `${kind}:read`,
    icon,
  })),
  { to: '/admin/users', label: 'Users', permission: 'user:manage', icon: 'users' },
  { to: '/admin/roles', label: 'Roles', permission: 'role:manage', icon: 'shield' },
]

// The sidebar and "/" have to agree on what this user can see, or landing on "/" sends
// them to a page their own menu does not list.
export function visibleNavItems({ can, isAdmin }) {
  return NAV_ITEMS.filter(
    (item) => (!item.adminOnly || isAdmin) && (!item.permission || can(item.permission))
  )
}

const ICONS = {
  grid: (
    <path
      d="M3 3h5.5v5.5H3zM11.5 3H17v5.5h-5.5zM3 11.5h5.5V17H3zM11.5 11.5H17V17h-5.5z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  box: (
    <path
      d="M10 2.5l7 3.2v8.6l-7 3.2-7-3.2V5.7l7-3.2zM3 5.7l7 3.2 7-3.2M10 8.9v8.6"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  users: (
    <path
      d="M7.5 9.5a2.75 2.75 0 100-5.5 2.75 2.75 0 000 5.5zM2 17c0-2.8 2.3-4.5 5.5-4.5S13 14.2 13 17M14 4.2a2.75 2.75 0 010 5.3M15 17c0-2.3-.9-3.7-2.3-4.6"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  shield: (
    <path
      d="M10 2.5l6 2.2v4.6c0 3.9-2.5 6.8-6 8.2-3.5-1.4-6-4.3-6-8.2V4.7l6-2.2z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  cart: (
    <path
      d="M2.5 3h2l1.6 9.2a1.5 1.5 0 001.5 1.3h6.4a1.5 1.5 0 001.5-1.2l1.2-6.3H5.3M8 17a1 1 0 100-2 1 1 0 000 2zM14 17a1 1 0 100-2 1 1 0 000 2z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  truck: (
    <path
      d="M2.5 5.5h8.5v7.5h-8.5zM11 8.5h3l2.5 2.5v2.5h-5.5zM6 15.9a1.3 1.3 0 100-2.6 1.3 1.3 0 000 2.6zM14 15.9a1.3 1.3 0 100-2.6 1.3 1.3 0 000 2.6z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  logout: (
    <path
      d="M8 4H5v12h3M12 10.5l3-3.5M12 10.5l3 3.5M12 10.5H8"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  sun: (
    <path
      d="M10 13.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM10 2v1.6M10 16.4V18M18 10h-1.6M3.6 10H2M15.7 4.3l-1.1 1.1M5.4 14.6l-1.1 1.1M15.7 15.7l-1.1-1.1M5.4 5.4L4.3 4.3"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  moon: (
    <path
      d="M16.5 11.8A6.8 6.8 0 018.2 3.5a6.8 6.8 0 108.3 8.3z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

function NavIcon({ name }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="h-5 w-5 shrink-0">
      {ICONS[name]}
    </svg>
  )
}

// Shows the theme you would switch TO, which is the convention people already read: a moon
// means "go dark". The label says it in words for anyone who does not read the glyph that
// way, and aria-pressed is what actually announces the current state.
function ThemeToggle({ theme, onToggle }) {
  const goingDark = theme === 'light'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={theme === 'dark'}
      aria-label={goingDark ? 'Switch to dark theme' : 'Switch to light theme'}
      title={goingDark ? 'Switch to dark theme' : 'Switch to light theme'}
      className="cursor-pointer rounded-full p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
    >
      <NavIcon name={goingDark ? 'moon' : 'sun'} />
    </button>
  )
}

function Wordmark({ className = 'text-lg' }) {
  return (
    <span className={`font-semibold tracking-tight text-brand-700 ${className}`}>
      Mavio<span className="text-ink-400"> Global</span>
    </span>
  )
}

function SidebarNav({ navItems, onNavigate }) {
  return (
    <nav className="flex-1 px-3 py-2" aria-label="Primary">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-400">Menu</p>
      <div className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-xl py-2.5 pl-4 pr-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-brand-600" aria-hidden="true" />
                )}
                <NavIcon name={item.icon} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

// The role line is `roleName` (the custom role, e.g. "Compliance reviewer") falling back
// to the account role — a staff user with no role assigned would otherwise show nothing
// at all, which reads as a rendering bug rather than as "you have no permissions yet".
function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false)
  const initial = user?.fullName?.charAt(0)?.toUpperCase() || '?'

  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-ink-100"
      >
        {/* brand-600 is a bright accent in dark mode, so white on it would vanish — the
            initial takes the ramp's dark end there instead (8:1). */}
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white dark:text-brand-50">
          {initial}
        </span>
        <span className="hidden text-sm font-medium text-ink-800 sm:block">{user?.fullName}</span>
      </button>

      {open && (
        <>
          {/* Full-screen backdrop rather than a document click listener: it closes the menu
              on any outside click without racing the toggle button's own handler. */}
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="glass-panel absolute right-0 z-50 mt-2 w-60 rounded-xl p-1" role="menu">
            <div className="border-b border-ink-100 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-ink-900">{user?.fullName}</p>
              <p className="truncate text-xs text-ink-500">{user?.email}</p>
              <p className="mt-1 text-xs font-medium capitalize text-brand-700">{user?.roleName || user?.role}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <NavIcon name="logout" />
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function AppShell() {
  const { user, can, isAdmin, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, toggleTheme] = useTheme()
  const location = useLocation()
  const navItems = visibleNavItems({ can, isAdmin })

  // Closing the drawer from the NavLink's own onClick would miss the browser Back button,
  // which navigates without any click of ours — the router's location IS the external
  // system here, so this stays an effect (oxlint's set-state-in-effect warning included).
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    // h-dvh + overflow-hidden at every width, not just md+: while mobile was
    // `min-h-screen` the shell grew with its content, so [data-app-scroll] never
    // overflowed and the window scrolled instead — which silently broke every
    // `position: sticky` inside a page, because the sticky element's nearest
    // overflow!=visible ancestor is that pane and the pane never scrolled.
    // dvh (not vh) so a phone's collapsing address bar can't clip the bottom.
    <div className="app-ambient-bg flex h-dvh flex-col overflow-hidden md:flex-row md:gap-4 md:p-4">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-ink-200 bg-surface px-4 md:hidden">
        <Wordmark className="text-base" />
        <div className="flex items-center gap-1">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            className="cursor-pointer rounded-lg p-2 text-ink-600 hover:bg-ink-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop sidebar — fixed height, does not scroll with main content */}
      <aside className="glass-sidebar hidden shrink-0 overflow-hidden rounded-2xl max-md:!hidden md:flex md:h-[calc(100vh-2rem)] md:w-64 md:flex-col">
        <div className="flex items-center border-b border-ink-100 px-6 py-5">
          <Wordmark />
        </div>
        <SidebarNav navItems={navItems} />
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              key="backdrop"
              aria-label="Close navigation overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="glass-sidebar fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col pt-14 md:hidden"
            >
              <div className="flex items-center border-b border-ink-100 px-6 py-5">
                <Wordmark />
              </div>
              <SidebarNav navItems={navItems} onNavigate={() => setMobileOpen(false)} />
              <div className="border-t border-ink-100 p-3">
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <NavIcon name="logout" />
                  Log out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="app-main-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl pt-14 md:min-h-[calc(100vh-2rem)] md:pt-0">
        <div className="hidden shrink-0 items-center justify-end gap-2 border-b border-ink-200 bg-surface px-6 py-2.5 md:flex">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <UserMenu user={user} logout={logout} />
        </div>

        <div data-app-scroll className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} {...routeTransition}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}
