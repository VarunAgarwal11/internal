import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthCard from '../components/layout/AuthCard'
import { Alert, Button, Input, Label } from '../components/ui/Primitives'

// Two icons, inline: a dependency for a pair of 12-line paths is not worth the install.
function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="h-5 w-5">
      <path d="M1.5 10S4.6 4.5 10 4.5 18.5 10 18.5 10 15.4 15.5 10 15.5 1.5 10 1.5 10z" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="2.5" strokeWidth="1.4" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="h-5 w-5">
      <path
        d="M3 3l14 14M8.2 8.3A2.5 2.5 0 0011.7 11.8M6.3 6.4C3.6 7.9 1.5 10 1.5 10S4.6 15.5 10 15.5c1.5 0 2.8-.4 3.9-1M16 12.6c1.6-1.3 2.5-2.6 2.5-2.6S15.4 4.5 10 4.5c-.6 0-1.2.1-1.7.2"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function LoginPage() {
  const { user, bootstrapping, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (bootstrapping) return null
  // ProtectedRoute stashed where you were headed before it bounced you here; going back
  // to "/" instead would lose a deep link to one supplier's form.
  if (user) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Sign in" subtitle="Mavio staff accounts only.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@mavioglobal.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <Label htmlFor="password">Password</Label>
          {/* The reveal toggle sits BESIDE the field, not inside it: at this corner radius
              an in-field control crowds the text, and a 48px target of its own is the one
              that is actually thumb-sized.

              min-w-0 on the input because a flex item defaults to min-width:auto — without
              it the input refuses to shrink past its intrinsic size and overflows the card
              on a narrow phone instead of giving way to the button. */}
          <div className="flex items-center gap-2">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              required
              className="min-w-0"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-500 transition-colors hover:text-ink-800"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <Alert className="mb-4">{error}</Alert>

        <Button type="submit" className="w-full py-3 text-base font-semibold" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {/* No register / forgot-password / magic link: accounts are created by an admin in
          the Users screen, and a password reset is a PATCH there too. */}
      <p className="mt-6 text-center text-xs text-ink-500">
        Lost your password? An administrator can reset it for you.
      </p>
    </AuthCard>
  )
}
