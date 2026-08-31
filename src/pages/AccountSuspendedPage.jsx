import { useAuth } from '../context/AuthContext'
import AuthCard from '../components/layout/AuthCard'
import { Alert, Button } from '../components/ui/Primitives'

// Must stay a public route — if it sat behind ProtectedRoute it would redirect-loop.
export default function AccountSuspendedPage() {
  const { logout } = useAuth()

  return (
    <AuthCard title="Account not active" subtitle="This account can't open the portal right now.">
      <Alert>Your account has been suspended. Contact an administrator to have it reactivated.</Alert>
      <Button variant="secondary" className="mt-4 w-full" onClick={logout}>
        Sign out
      </Button>
    </AuthCard>
  )
}
