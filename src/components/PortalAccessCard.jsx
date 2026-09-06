import { useEffect, useState } from 'react'
import * as api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { Alert, Button, Card, Input, Label } from './ui/Primitives'
import { UserStatusBadge } from './Badges'
import Modal from './ui/Modal'
import { timeAgo } from '../utils/format'

const EMPTY_DRAFT = { fullName: '', email: '', password: '' }

// The one-time copyable text a staff member pastes into WhatsApp — no WhatsApp
// integration exists, so this is done by hand. It never appears again after this
// render: the server returns it exactly once, on the request that minted or reset the
// credential, and nothing here stores it.
function InviteMessage({ message }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission denied — the text is still selectable on screen.
    }
  }
  return (
    <Alert tone="success" className="mb-4">
      <p className="mb-2 font-medium">Share these details with the partner (WhatsApp or otherwise):</p>
      <pre className="mb-2 whitespace-pre-wrap rounded-lg bg-white/60 p-3 text-xs text-ink-800">{message}</pre>
      <Button type="button" variant="secondary" onClick={copy}>
        {copied ? 'Copied ✓' : 'Copy'}
      </Button>
    </Alert>
  )
}

// Visible only once a partner is approved and the viewer holds {kind}:login — both
// checked by the caller. Mints, lists, resets and suspends the login a partner signs
// into the separate partner-portal app with; the portal itself is read-only for them.
export default function PortalAccessCard({ partnerId, kindLabel }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [logins, setLogins] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [resettingId, setResettingId] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [inviteMessage, setInviteMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    api
      .getPartnerLogins(partnerId)
      .then((result) => {
        if (active) setLogins(result)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [partnerId, refreshKey])

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await api.createPartnerLogin(partnerId, draft)
      setInviteMessage(result.inviteMessage)
      setCreating(false)
      setDraft(EMPTY_DRAFT)
      setRefreshKey((k) => k + 1)
      toast.success('Login created and mailed.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await api.updatePartnerLogin(partnerId, resettingId, { password: newPassword })
      setInviteMessage(result.inviteMessage)
      setResettingId(null)
      setNewPassword('')
      setRefreshKey((k) => k + 1)
      toast.success('Password reset and mailed.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleStatus(login) {
    const suspending = login.status === 'active'
    const ok = await confirm({
      title: suspending ? `Suspend ${login.fullName}'s login?` : `Reactivate ${login.fullName}'s login?`,
      message: suspending
        ? 'They keep no access to the partner portal until you reactivate this login.'
        : 'They will be able to sign in to the partner portal again immediately.',
      confirmLabel: suspending ? 'Suspend' : 'Reactivate',
      tone: suspending ? 'danger' : 'default',
    })
    if (!ok) return
    setBusyId(login.id)
    try {
      await api.updatePartnerLogin(partnerId, login.id, { status: suspending ? 'suspended' : 'active' })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(login) {
    const ok = await confirm({
      title: `Remove ${login.fullName}'s login?`,
      message: 'They will no longer be able to sign in to the partner portal at all.',
      confirmLabel: 'Remove',
      tone: 'danger',
    })
    if (!ok) return
    setBusyId(login.id)
    try {
      await api.deletePartnerLogin(partnerId, login.id)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card className="mb-4 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-900">Portal access</h2>
          <p className="text-sm text-ink-500">Logins for this {kindLabel.toLowerCase()} to sign in to their own portal.</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Create login</Button>
      </div>

      {inviteMessage && <InviteMessage message={inviteMessage} />}
      {error && <Alert className="mb-4">{error}</Alert>}

      {logins && logins.length === 0 && <p className="text-sm text-ink-500">No logins yet.</p>}

      {logins && logins.length > 0 && (
        <div className="divide-y divide-ink-100">
          {logins.map((login) => (
            <div key={login.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{login.fullName}</p>
                <p className="truncate text-xs text-ink-500">{login.email}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-ink-500">
                <UserStatusBadge status={login.status} />
                {login.mustChangePassword && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                    Password not set
                  </span>
                )}
                <span>{login.lastLoginAt ? `Last in ${timeAgo(login.lastLoginAt)}` : 'Never signed in'}</span>
                <Button
                  variant="secondary"
                  className="px-3 py-1 text-xs"
                  onClick={() => setResettingId(login.id)}
                  disabled={busyId === login.id}
                >
                  Reset password
                </Button>
                <Button
                  variant="secondary"
                  className="px-3 py-1 text-xs"
                  onClick={() => handleToggleStatus(login)}
                  disabled={busyId === login.id}
                >
                  {login.status === 'active' ? 'Suspend' : 'Reactivate'}
                </Button>
                <Button
                  variant="danger"
                  className="px-3 py-1 text-xs"
                  onClick={() => handleRemove(login)}
                  disabled={busyId === login.id}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="Create portal login" onClose={() => setCreating(false)}>
          <form onSubmit={handleCreate}>
            <div className="mb-4">
              <Label htmlFor="pl-name">Full name</Label>
              <Input
                id="pl-name"
                required
                value={draft.fullName}
                onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="pl-email">Email</Label>
              <Input
                id="pl-email"
                type="email"
                required
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="pl-password">Temporary password</Label>
              <Input
                id="pl-password"
                type="text"
                minLength={9}
                required
                value={draft.password}
                onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
              />
              <p className="mt-1.5 text-xs text-ink-500">
                They'll be asked to set their own password the first time they sign in.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create and send'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {resettingId && (
        <Modal title="Reset password" onClose={() => setResettingId(null)}>
          <form onSubmit={handleResetPassword}>
            <Label htmlFor="pl-reset">New temporary password</Label>
            <Input
              id="pl-reset"
              type="text"
              minLength={9}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="mt-1.5 mb-4 text-xs text-ink-500">
              This signs them out everywhere and forces a new password on next sign-in.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setResettingId(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Resetting…' : 'Reset and send'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  )
}
