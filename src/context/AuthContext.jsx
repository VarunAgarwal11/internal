import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../services/api'
import { setAuthErrorHandler } from '../services/http'

const AuthContext = createContext(null)

// The server is the only source of truth for who you are. Nothing is stored in
// localStorage: the session is an httpOnly cookie that JS cannot read, which is
// what keeps XSS from stealing it.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setBootstrapping(false))

    // Any 401/403 means the cookie no longer matches the user this tab is rendering
    // (another login in the same browser replaces it, or an admin edited this user's
    // role while the tab sat open). Re-reading here is what stops a demoted user's tab
    // from still showing an Approve button.
    setAuthErrorHandler(() => {
      api
        .getMe()
        .then(setUser)
        .catch(() => setUser(null))
    })
  }, [])

  const login = useCallback(async (email, password) => {
    const result = await api.login({ email, password })
    setUser(result)
    return result
  }, [])

  const logout = useCallback(async () => {
    // Clearing local state matters more than the round trip; a failed call must
    // still log you out of this tab rather than reject into an unhandled promise.
    await api.logout().catch(() => {})
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    const result = await api.getMe()
    setUser(result)
    return result
  }, [])

  // `user.permissions` is the EFFECTIVE list: the server computes it and short-circuits
  // superadmin/admin THERE. This frontend deliberately holds no catalog of its own — the
  // one mirrored FE/BE permission list in the neighbouring KIORA repo
  // (website/demoportfolio/src/lib/adminPermissions.ts vs
  // kiora-ckd-backend/app/auth/cms_permissions.py) has already drifted out of sync and
  // neither side knows it. Asking "is this string in the list I was handed" cannot drift.
  //
  // This is a gate on what is RENDERED. It is never the enforcement point: every route
  // behind it re-checks server-side, because a hidden button is not a closed door.
  const can = useCallback((permission) => Boolean(user?.permissions?.includes(permission)), [user])

  // The account role, not a permission: superadmin and admin already hold every
  // permission (users.py PRIVILEGED), so no `can` string can tell them apart from a staff
  // user who was granted the same rights one by one.
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin'

  const value = useMemo(
    () => ({ user, bootstrapping, can, isAdmin, login, logout, refresh }),
    [user, bootstrapping, can, isAdmin, login, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
