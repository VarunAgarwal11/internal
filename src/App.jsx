import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppShell, { visibleNavItems } from './components/layout/AppShell'
import { EmptyState } from './components/ui/Primitives'
import LoginPage from './pages/LoginPage'
import AccountSuspendedPage from './pages/AccountSuspendedPage'
import DashboardPage from './pages/DashboardPage'
import PartnersPage from './pages/PartnersPage'
import PartnerFormPage from './pages/PartnerFormPage'
import PartnerReviewPage from './pages/PartnerReviewPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminRolesPage from './pages/AdminRolesPage'
import NotFoundPage from './pages/NotFoundPage'

// "/" has no page of its own — it forwards to the first sidebar entry this user can
// actually see (the dashboard for an admin, their first section otherwise). Without it a
// user holding only user:manage lands on /suppliers, is bounced to "/" by its permission
// guard, and bounces straight back: a redirect loop that looks like a broken app rather
// than a missing permission.
function HomeRedirect() {
  const { can, isAdmin } = useAuth()
  const first = visibleNavItems({ can, isAdmin })[0]
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
        {/* The partner's own read-only copy of their form, authorised by the token in the
            path and nothing else. Outside ProtectedRoute because the reader has no account
            here and never will — inside it, every link Mavio mails would land on /login. */}
        <Route path="/review/:token" element={<PartnerReviewPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomeRedirect />} />

            {/* Role-gated rather than permission-gated: superadmin and admin hold every
                permission, so only the account role separates them from a staff user with
                the same grants. Its tiles are still filtered per permission. */}
            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            {/* Nested ProtectedRoute is the whole of permission routing — there is no
                separate AdminRoute, and every one of these re-checks server-side.
                Every partner kind is the same page pair parameterized by `kind`
                (deps.partner_dep enforces f"{kind}:{action}" on one route tree
                server-side too) — not a second copy that a bug fix could miss. */}
            <Route element={<ProtectedRoute permission="supplier:read" />}>
              <Route path="/suppliers" element={<PartnersPage kind="supplier" />} />
              <Route path="/suppliers/:partnerId" element={<PartnerFormPage kind="supplier" />} />
            </Route>

            <Route element={<ProtectedRoute permission="buyer:read" />}>
              <Route path="/buyers" element={<PartnersPage kind="buyer" />} />
              <Route path="/buyers/:partnerId" element={<PartnerFormPage kind="buyer" />} />
            </Route>

            <Route element={<ProtectedRoute permission="logistics_cha:read" />}>
              <Route path="/logistics-cha" element={<PartnersPage kind="logistics_cha" />} />
              <Route path="/logistics-cha/:partnerId" element={<PartnerFormPage kind="logistics_cha" />} />
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
