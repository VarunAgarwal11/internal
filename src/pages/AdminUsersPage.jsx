import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import * as api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useDebounced } from '../hooks/useDebounced'
import { Alert, Button, Card, EmptyState, Input, Label, LoadingState, PageHeader, Select } from '../components/ui/Primitives'
import { UserStatusBadge } from '../components/Badges'
import Modal from '../components/ui/Modal'
import PageMotion, { PageSection } from '../components/ui/PageMotion'
import { listItem, staggerContainer } from '../utils/motion'
import { formatDate } from '../utils/format'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deleted', label: 'Deleted' },
]

// The account tier, which is not the same thing as the assigned role: superadmin and
// admin are short-circuited server-side and ignore roleId entirely, staff gets exactly
// what its role grants. Both are stored, so both are edited here.
const ACCOUNT_ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' },
]

const EMPTY_DRAFT = { email: '', fullName: '', password: '', role: 'staff', roleId: '' }

export default function AdminUsersPage() {
  const [users, setUsers] = useState(null)
  const [roles, setRoles] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState(null)
  // Bumped after every mutation. One refetch beats three different local-merge rules —
  // a soft-deleted user has to leave the list when the status filter is 'active', and
  // patching the row in place would leave it sitting there.
  const [refreshKey, setRefreshKey] = useState(0)
  const debouncedSearch = useDebounced(search, 300)
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    let active = true
    api
      .getUsers({ search: debouncedSearch, status })
      .then((result) => {
        if (!active) return
        setUsers(result)
        setError('')
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [debouncedSearch, status, refreshKey])

  // Fetched once, not per keystroke: the role catalog does not change while you type.
  // A failure is swallowed — /roles may be gated on role:manage, which a user:manage
  // account need not hold, and an error banner over the user list would be misleading.
  useEffect(() => {
    let active = true
    api
      .getRoles()
      .then((result) => active && setRoles(result))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.createUser(draft)
      setCreating(false)
      setDraft(EMPTY_DRAFT)
      setRefreshKey((k) => k + 1)
      toast.success(`${draft.fullName} added.`)
    } catch (err) {
      // The server owns every rule here — password strength, duplicate email, and who is
      // allowed to mint a superadmin. Showing its sentence beats guessing at a local one.
      setError(err.message)
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function patchUser(user, patch, { title, message, confirmLabel, tone = 'default', success }) {
    if (!(await confirm({ title, message, confirmLabel, tone }))) return
    setBusyId(user.id)
    try {
      await api.updateUser(user.id, patch)
      setRefreshKey((k) => k + 1)
      toast.success(success)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  // The <select> is controlled by user.roleId, so declining the confirmation needs no
  // undo: nothing was written, and the next render puts the old value straight back.
  function handleRoleChange(user, roleId) {
    const label = roles.find((r) => r.id === roleId)?.name || 'no role'
    return patchUser(
      user,
      { roleId: roleId || null },
      {
        title: `Change ${user.fullName}'s role?`,
        message: `They will get exactly the permissions of ${label}, on their next request.`,
        confirmLabel: 'Change role',
        success: `${user.fullName} is now ${label}.`,
      }
    )
  }

  function handleToggleStatus(user) {
    const suspending = user.status === 'active'
    return patchUser(
      user,
      { status: suspending ? 'suspended' : 'active' },
      {
        title: suspending ? `Suspend ${user.fullName}?` : `Reactivate ${user.fullName}?`,
        message: suspending
          ? 'They stay on this list and keep their role, but every request is refused until you reactivate them.'
          : 'They will be able to sign in again immediately.',
        confirmLabel: suspending ? 'Suspend' : 'Reactivate',
        tone: suspending ? 'danger' : 'default',
        success: suspending ? `${user.fullName} suspended.` : `${user.fullName} reactivated.`,
      }
    )
  }

  async function handleDelete(user) {
    if (
      !(await confirm({
        title: `Delete ${user.fullName}?`,
        message: 'The account is retired, not erased — their name stays readable on everything they touched.',
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return
    setBusyId(user.id)
    try {
      await api.deleteUser(user.id)
      setRefreshKey((k) => k + 1)
      toast.success(`${user.fullName} removed.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageMotion>
      <PageHeader
        title="Users"
        subtitle="Every account on the portal, and the role each one carries."
        actions={<Button onClick={() => setCreating(true)}>+ New user</Button>}
      />

      <PageSection className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="sm:max-w-[10rem]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </PageSection>

      {error && !creating && (
        <PageSection>
          <Alert className="mb-4">{error}</Alert>
        </PageSection>
      )}

      <PageSection>
        {!users ? (
          error ? null : <LoadingState label="Loading users…" />
        ) : users.length === 0 ? (
          <EmptyState title="No users match your filters" description="Try a different search term or status." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Account</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Added</th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <motion.tbody
                  className="divide-y divide-ink-100"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                >
                  {users.map((user) => (
                    <motion.tr key={user.id} variants={listItem} className="hover:bg-ink-50">
                      <td className="px-5 py-3">
                        <span className="font-medium text-ink-900">{user.fullName}</span>
                        <p className="text-xs text-ink-400">{user.email}</p>
                      </td>
                      <td className="px-5 py-3 capitalize text-ink-600">{user.role}</td>
                      <td className="px-5 py-3">
                        {user.role === 'staff' ? (
                          <Select
                            value={user.roleId || ''}
                            aria-label={`Role for ${user.fullName}`}
                            disabled={busyId === user.id || user.status === 'deleted'}
                            onChange={(e) => handleRoleChange(user, e.target.value)}
                            className="min-w-[11rem] px-3 py-1.5 text-xs"
                          >
                            <option value="">No role</option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          // Admins and superadmins hold every permission server-side, so a
                          // role picker here would imply a restriction that does not exist.
                          <span className="text-xs text-ink-400">All permissions</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <UserStatusBadge status={user.status} />
                      </td>
                      <td className="px-5 py-3 text-ink-600">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-3 text-right">
                        {user.status !== 'deleted' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              className="px-2.5 py-1 text-xs"
                              disabled={busyId === user.id}
                              onClick={() => handleToggleStatus(user)}
                            >
                              {user.status === 'active' ? 'Suspend' : 'Activate'}
                            </Button>
                            <Button
                              variant="danger"
                              className="px-2.5 py-1 text-xs"
                              disabled={busyId === user.id}
                              onClick={() => handleDelete(user)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </Card>
        )}
      </PageSection>

      {creating && (
        <Modal title="New user" onClose={() => setCreating(false)}>
          {error && <Alert className="mb-4">{error}</Alert>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="off"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                required
                value={draft.fullName}
                onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">Temporary password</Label>
              {/* new-password, not off: telling the browser what this is gets a generated
                  suggestion instead of an autofill of the admin's own credentials. */}
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="accountRole">Account</Label>
                <Select
                  id="accountRole"
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                >
                  {ACCOUNT_ROLES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="roleId">Role</Label>
                <Select
                  id="roleId"
                  value={draft.roleId}
                  disabled={draft.role !== 'staff'}
                  onChange={(e) => setDraft({ ...draft, roleId: e.target.value })}
                >
                  <option value="">No role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="text-xs text-ink-500">
              A staff account with no role can sign in but sees nothing — assign one here or from the list.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create user'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageMotion>
  )
}
