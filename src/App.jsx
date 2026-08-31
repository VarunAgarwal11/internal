import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppShell, { NAV_ITEMS } from './components/layout/AppShell'
import { EmptyState } from './components/ui/Primitives'
import LoginPage from './pages/LoginPage'
import AccountSuspendedPage from './pages/AccountSuspendedPage'
import SuppliersPage from './pages/SuppliersPage'
import SupplierFormPage from './pages/SupplierFormPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminRolesPage from './pages/AdminRolesPage'
import NotFoundPage from './pages/NotFoundPage'

// "/" has no page of its own — it forwards to the first section this user can actually
// see. Without it a user holding only user:manage lands on /suppliers, is bounced to "/"
// by its permission guard, and bounces straight back: a redirect loop that looks like a
// broken app rather than a missing permission.
function HomeRedirect() {
  const { can } = useAuth()
  const first = NAV_ITEMS.find((item) => can(item.permission))
  if (first) return <Navigate to={first.to} replace />
  return (
    <EmptyState
      title="No sections assigned"
      description="Ask an administrator to assign you a role."
    />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Public on purpose — behind ProtectedRoute this would redirect-loop. */}
        <Route path="/account-suspended" element={<AccountSuspendedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomeRedirect />} />

            {/* Nested ProtectedRoute is the whole of permission routing — there is no
                separate AdminRoute, and every one of these re-checks server-side. */}
            <Route element={<ProtectedRoute permission="supplier:read" />}>
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/suppliers/:partnerId" element={<SupplierFormPage />} />
            </Route>

            <Route element={<ProtectedRoute permission="user:manage" />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>

            <Route element={<ProtectedRoute permission="role:manage" />}>
              <Route path="/admin/roles" element={<AdminRolesPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
