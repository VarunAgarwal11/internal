import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// One component covers all four cases: the bootstrap flash, unauthenticated,
// suspended, and missing-permission. No separate AdminRoute.
export default function ProtectedRoute({ permission }) {
  const { user, bootstrapping, can } = useAuth()
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
  if (permission && !can(permission)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
