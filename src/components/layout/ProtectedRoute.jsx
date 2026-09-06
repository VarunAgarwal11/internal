import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// One component covers all five cases: the bootstrap flash, unauthenticated, suspended,
// missing-permission and admin-only. No separate AdminRoute.
//
// `permission` is a string OR a list — a list means "any one of these", for the one
// screen so far that spans every kind (Partner Logins: supplier/buyer/logistics_cha
// each have their own {kind}:login) rather than gating on a single fixed string.
export default function ProtectedRoute({ permission, adminOnly }) {
  const { user, bootstrapping, can, isAdmin } = useAuth()
  const location = useLocation()

  // Without this the first paint after a hard refresh redirects to /login while
  // GET /auth/me is still in flight.
  if (bootstrapping) return null

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (user.status !== 'active') {
    return <Navigate to="/account-suspended" replace />
  }
  // Cosmetic, like every other `can` call: the route behind this re-checks server-side.
  const allowed = !permission || (Array.isArray(permission) ? permission.some(can) : can(permission))
  if (!allowed) {
    return <Navigate to="/" replace />
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
