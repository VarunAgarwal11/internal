import { Fragment, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import * as api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { Alert, Button, Card, EmptyState, Input, Label, LoadingState, PageHeader } from '../components/ui/Primitives'
import Modal from '../components/ui/Modal'
import PageMotion, { PageSection } from '../components/ui/PageMotion'
import { listItem, staggerContainer } from '../utils/motion'

const EMPTY_DRAFT = { name: '', description: '', permissions: [] }

// Every label, group and id in this editor came from GET /permissions, so the screen can
// never disagree with the server about what a permission is or what it is called. The
// only thing the frontend decides is the order the groups happen to arrive in.
function PermissionPicker({ catalog, selected, onToggle }) {
  const groups = Object.groupBy(catalog, (p) => p.group)

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, items]) => {
        const chosen = items.filter((p) => selected.includes(p.id)).length
        return (
          <div key={group} className="rounded-xl border border-ink-200 p-3">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink-800">{group}</p>
              <span className="text-xs text-ink-500">
                {chosen} of {items.length}
              </span>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {items.map((permission) => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-ink-50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={selected.includes(permission.id)}
                    onChange={() => onToggle(permission.id)}
                  />
                  {permission.label}
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [error, setError] = useState('')
  // { id, message } — a delete refused because users still hold the role. Kept per-row
  // rather than in a toast: the sentence is about one line of the table.
  const [blocked, setBlocked] = useState(null)
  const [editing, setEditing] = useState(null) // the role being edited, or 'new'
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    let active = true
    api
      .getRoles()
      .then((result) => {
        if (!active) return
        setRoles(result)
        setError('')
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [refreshKey])

  useEffect(() => {
    let active = true
    api
      .getPermissions()
      .then((result) => active && setCatalog(result))
      .catch((err) => active && setError(err.message))
    return () => {
      active = false
    }
  }, [])

  function openEditor(role) {
    setEditing(role || 'new')
    setDraft(
      role
        ? { name: role.name, description: role.description || '', permissions: role.permissions }
        : EMPTY_DRAFT
    )
    setError('')
  }

  function togglePermission(id) {
    setDraft((current) => ({
      ...current,
      permissions: current.permissions.includes(id)
        ? current.permissions.filter((p) => p !== id)
        : [...current.permissions, id],
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (editing === 'new') {
        await api.createRole(draft)
      } else {
        await api.updateRole(editing.id, draft)
      }
      setEditing(null)
      setRefreshKey((k) => k + 1)
      toast.success(`Role ${editing === 'new' ? 'created' : 'saved'}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(role) {
    if (
      !(await confirm({
        title: `Delete ${role.name}?`,
        message: 'Anyone holding it loses every permission it granted.',
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return
    setBusyId(role.id)
    setBlocked(null)
    try {
      await api.deleteRole(role.id)
      setRefreshKey((k) => k + 1)
      toast.success(`${role.name} deleted.`)
    } catch (err) {
      // 409 role_in_use is the expected refusal, not a failure — the count comes from the
      // row we already have, so the sentence stays right even if the server's wording moves.
      if (err.code === 'role_in_use') {
        setBlocked({
          id: role.id,
          message: `${role.userCount} ${role.userCount === 1 ? 'user still holds' : 'users still hold'} this role. Reassign them first.`,
        })
      } else {
        toast.error(err.message)
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageMotion>
      <PageHeader
        title="Roles"
        subtitle="A role is a named set of permissions. Assign one to a staff account from the Users screen."
        actions={<Button onClick={() => openEditor(null)}>+ New role</Button>}
      />

      {error && !editing && (
        <PageSection>
          <Alert className="mb-4">{error}</Alert>
        </PageSection>
      )}

      <PageSection>
        {!roles ? (
          error ? null : <LoadingState label="Loading roles…" />
        ) : roles.length === 0 ? (
          <EmptyState title="No roles yet" description="Create one to start assigning permissions to staff." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Permissions</th>
                    <th className="px-5 py-3 font-medium">Users</th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <motion.tbody
                  className="divide-y divide-ink-100"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                >
                  {roles.map((role) => (
                    <Fragment key={role.id}>
                      <motion.tr variants={listItem} className="hover:bg-ink-50">
                        <td className="px-5 py-3">
                          <span className="font-medium text-ink-900">{role.name}</span>
                          {role.description && <p className="text-xs text-ink-400">{role.description}</p>}
                        </td>
                        <td className="px-5 py-3 text-ink-600">{role.permissions.length}</td>
                        <td className="px-5 py-3 text-ink-600">{role.userCount}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => openEditor(role)}>
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              className="px-2.5 py-1 text-xs"
                              disabled={busyId === role.id}
                              onClick={() => handleDelete(role)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                      {blocked?.id === role.id && (
                        <tr>
                          <td colSpan={4} className="px-5 pb-3">
                            <Alert>{blocked.message}</Alert>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </Card>
        )}
      </PageSection>

      {editing && (
        <Modal
          title={editing === 'new' ? 'New role' : `Edit ${editing.name}`}
          onClose={() => setEditing(null)}
          maxWidthClassName="max-w-2xl"
        >
          <form onSubmit={handleSave}>
            {error && <Alert className="mb-4">{error}</Alert>}
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="roleName">Name</Label>
                <Input
                  id="roleName"
                  required
                  autoFocus
                  placeholder="e.g. Compliance reviewer"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="roleDescription">Description</Label>
                <Input
                  id="roleDescription"
                  placeholder="Optional"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
            </div>

            <PermissionPicker catalog={catalog} selected={draft.permissions} onToggle={togglePermission} />

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !draft.name.trim()}>
                {submitting ? 'Saving…' : 'Save role'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageMotion>
  )
}
