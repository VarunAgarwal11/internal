import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useDebounced } from '../hooks/useDebounced'
import { Alert, Button, Card, EmptyState, Input, Label, LoadingState, PageHeader, Select } from '../components/ui/Primitives'
import { PartnerStatusBadge } from '../components/Badges'
import Modal from '../components/ui/Modal'
import PageMotion, { PageSection } from '../components/ui/PageMotion'
import { listItem, staggerContainer } from '../utils/motion'
import { formatDate } from '../utils/format'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function SuppliersPage() {
  // null = still loading, [] = loaded and empty. One sentinel, so the spinner and the
  // "no results" panel can never both be right.
  const [suppliers, setSuppliers] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [creating, setCreating] = useState(false)
  const [legalName, setLegalName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  // Typing "hindustan" is one request after the pause, not nine.
  const debouncedSearch = useDebounced(search, 300)
  const navigate = useNavigate()
  const { can } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    let active = true
    api
      .getPartners({ kind: 'supplier', status, q: debouncedSearch })
      .then((result) => {
        if (!active) return
        setSuppliers(result)
        setError('')
      })
      .catch((err) => {
        // Without this the page sits on its spinner forever when the API is down.
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [debouncedSearch, status])

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      // Created first, then navigated to. There is no /suppliers/new route on purpose:
      // in a "new" mode autosave has nothing to save against and an upload has nothing to
      // attach to, so the row has to exist before the form opens.
      const created = await api.createPartner({ kind: 'supplier', legalName: legalName.trim() })
      navigate(`/suppliers/${created.id}`)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
      setSubmitting(false)
    }
  }

  async function handleDelete(supplier) {
    const name = supplier.legalName || 'this supplier'
    if (
      !(await confirm({
        title: `Delete ${name}?`,
        message: 'This removes the onboarding record and every document uploaded against it.',
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return
    setDeletingId(supplier.id)
    setError('')
    try {
      await api.deletePartner(supplier.id)
      setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id))
      toast.success(`${name} removed.`)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageMotion>
      <PageHeader
        title="Suppliers"
        subtitle="Every onboarding record, draft through approved."
        actions={can('supplier:create') && <Button onClick={() => setCreating(true)}>+ New supplier</Button>}
      />

      <PageSection className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          placeholder="Search by name, GSTIN or PAN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search suppliers"
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

      {/* Suppressed while the modal is open — the modal renders the same error on top of
          it, and a copy behind the dialog is one nobody can read. */}
      {error && !creating && (
        <PageSection>
          <Alert className="mb-4">{error}</Alert>
        </PageSection>
      )}

      <PageSection>
        {!suppliers ? (
          error ? null : <LoadingState label="Loading suppliers…" />
        ) : suppliers.length === 0 ? (
          <EmptyState title="No suppliers match your filters" description="Try a different search term or status." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Legal name</th>
                    <th className="px-5 py-3 font-medium">Business type</th>
                    <th className="px-5 py-3 font-medium">GSTIN</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Updated</th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <motion.tbody
                  className="divide-y divide-ink-100"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                >
                  {suppliers.map((supplier) => (
                    <motion.tr
                      key={supplier.id}
                      variants={listItem}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ${supplier.legalName || 'untitled supplier'}`}
                      onClick={() => navigate(`/suppliers/${supplier.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/suppliers/${supplier.id}`)
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
                    >
                      <td className="px-5 py-3">
                        {/* legalName is the only field POST /partners takes, but it is still
                            nullable server-side, so a row can reach here without one. */}
                        <span className="font-medium text-brand-700">{supplier.legalName || 'Untitled supplier'}</span>
                        {supplier.tradeName && <p className="text-xs text-ink-400">{supplier.tradeName}</p>}
                      </td>
                      <td className="px-5 py-3 text-ink-600">{supplier.businessType || '—'}</td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-600">{supplier.gstin || '—'}</td>
                      <td className="px-5 py-3">
                        <PartnerStatusBadge status={supplier.status} />
                      </td>
                      <td className="px-5 py-3 text-ink-600">{formatDate(supplier.updatedAt)}</td>
                      <td
                        className="px-5 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {can('supplier:delete') && (
                          <Button
                            variant="danger"
                            className="px-2.5 py-1 text-xs"
                            disabled={deletingId === supplier.id}
                            onClick={() => handleDelete(supplier)}
                          >
                            {deletingId === supplier.id ? 'Deleting…' : 'Delete'}
                          </Button>
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
        <Modal title="New supplier" onClose={() => setCreating(false)} maxWidthClassName="max-w-md">
          {error && <Alert className="mb-4">{error}</Alert>}
          {/* Only the legal name: everything else on the record belongs to the onboarding
              form, and asking for it twice is how the two copies start to disagree. */}
          <form onSubmit={handleCreate}>
            <Label htmlFor="legalName">Registered legal name</Label>
            <Input
              id="legalName"
              autoFocus
              required
              placeholder="e.g. Sunrise Exports Private Limited"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !legalName.trim()}>
                {submitting ? 'Creating…' : 'Create & open form'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageMotion>
  )
}
