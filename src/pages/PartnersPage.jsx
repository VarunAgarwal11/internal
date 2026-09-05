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
import { KINDS } from '../config/kinds'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

// Serves /suppliers, /buyers and /logistics-cha: the backend's permission model is already
// f"{kind}:{action}" on one route tree (see deps.partner_dep), so one parameterized page
// is the smaller, non-drifting mirror of that on this side — not a second ~230-line copy
// that fixes a bug in one and not the other.
export default function PartnersPage({ kind }) {
  // `singular` is the label, capitalisation and all — lowercasing it for mid-sentence use
  // would turn "Logistics / CHA partner" into "logistics / cha partner" and eat an acronym.
  const { path: base, plural, label: singular, idLabel, idField, placeholder } = KINDS[kind]

  // null = still loading, [] = loaded and empty. One sentinel, so the spinner and the
  // "no results" panel can never both be right.
  const [partners, setPartners] = useState(null)
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
      .getPartners({ kind, status, q: debouncedSearch })
      .then((result) => {
        if (!active) return
        setPartners(result)
        setError('')
      })
      .catch((err) => {
        // Without this the page sits on its spinner forever when the API is down.
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [kind, debouncedSearch, status])

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      // Created first, then navigated to. There is no /suppliers/new (or /buyers/new)
      // route on purpose: in a "new" mode autosave has nothing to save against and an
      // upload has nothing to attach to, so the row has to exist before the form opens.
      const created = await api.createPartner({ kind, legalName: legalName.trim() })
      navigate(`${base}/${created.id}`)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
      setSubmitting(false)
    }
  }

  async function handleDelete(partner) {
    const name = partner.legalName || `this ${singular}`
    if (
      !(await confirm({
        title: `Delete ${name}?`,
        message: 'This removes the onboarding record and every document uploaded against it.',
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return
    setDeletingId(partner.id)
    setError('')
    try {
      await api.deletePartner(partner.id)
      setPartners((prev) => prev.filter((p) => p.id !== partner.id))
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
        title={plural}
        subtitle="Every onboarding record, draft through approved."
        actions={can(`${kind}:create`) && <Button onClick={() => setCreating(true)}>+ New {singular}</Button>}
      />

      <PageSection className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          placeholder="Search by name, GSTIN, PAN or Tax ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={`Search ${plural.toLowerCase()}`}
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
        {!partners ? (
          error ? null : <LoadingState label={`Loading ${plural.toLowerCase()}…`} />
        ) : partners.length === 0 ? (
          <EmptyState title={`No ${plural.toLowerCase()} match your filters`} description="Try a different search term or status." />
        ) : (
          <Card className="overflow-hidden">
            {/* @container: stack-table collapses this to one card per row whenever the
                PANE is under 40rem — see index.css. The min-width that forces the sideways
                scroll is keyed to the same pane, not to the viewport. */}
            <div className="@container overflow-x-auto">
              <table className="stack-table w-full text-left text-sm @min-[40rem]:min-w-[760px]">
                <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Legal name</th>
                    <th className="px-5 py-3 font-medium">Business type</th>
                    <th className="px-5 py-3 font-medium">{idLabel}</th>
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
                  {partners.map((partner) => (
                    <motion.tr
                      key={partner.id}
                      variants={listItem}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ${partner.legalName || `untitled ${singular}`}`}
                      onClick={() => navigate(`${base}/${partner.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`${base}/${partner.id}`)
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
                    >
                      {/* The name cell carries no data-label: it is the card's own heading
                          in stacked form, and "LEGAL NAME" above it says nothing the name
                          does not. Every other cell needs its column back. */}
                      <td className="px-5 py-3">
                        {/* legalName is the only field POST /partners takes, but it is still
                            nullable server-side, so a row can reach here without one. */}
                        <span className="font-medium text-brand-700">{partner.legalName || `Untitled ${singular}`}</span>
                        {partner.tradeName && <p className="text-xs text-ink-400">{partner.tradeName}</p>}
                      </td>
                      <td data-label="Business type" className="px-5 py-3 text-ink-600">{partner.businessType || '—'}</td>
                      <td data-label={idLabel} className="px-5 py-3 font-mono text-xs text-ink-600">
                        {partner[idField] || '—'}
                      </td>
                      <td data-label="Status" className="px-5 py-3">
                        <PartnerStatusBadge status={partner.status} />
                      </td>
                      <td data-label="Updated" className="px-5 py-3 text-ink-600">{formatDate(partner.updatedAt)}</td>
                      <td
                        className="px-5 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {can(`${kind}:delete`) && (
                          <Button
                            variant="danger"
                            className="px-2.5 py-1 text-xs"
                            disabled={deletingId === partner.id}
                            onClick={() => handleDelete(partner)}
                          >
                            {deletingId === partner.id ? 'Deleting…' : 'Delete'}
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
        <Modal title={`New ${singular}`} onClose={() => setCreating(false)} maxWidthClassName="max-w-md">
          {error && <Alert className="mb-4">{error}</Alert>}
          {/* Only the legal name: everything else on the record belongs to the onboarding
              form, and asking for it twice is how the two copies start to disagree. */}
          <form onSubmit={handleCreate}>
            <Label htmlFor="legalName">Registered legal name</Label>
            <Input
              id="legalName"
              autoFocus
              required
              placeholder={placeholder}
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
