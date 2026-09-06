import { useEffect, useMemo, useState } from 'react'
import * as api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDebounced } from '../hooks/useDebounced'
import { Alert, Card, EmptyState, Input, LoadingState, PageHeader } from '../components/ui/Primitives'
import PageMotion, { PageSection } from '../components/ui/PageMotion'
import PortalAccessCard from '../components/PortalAccessCard'
import { KINDS } from '../config/kinds'

// Global entry point for "create a partner login" — pick a kind, pick an approved
// partner of that kind, then the same PortalAccessCard the partner's own form page
// shows renders below. That inline card stays where it is too: this page is for
// starting from "I need to give someone a login" with no partner open yet, not a
// replacement for it.
export default function PartnerLoginsPage() {
  const { can } = useAuth()
  // Only the kinds this account actually holds {kind}:login for — a custom role sees
  // exactly the tabs it can act on, the same rule the sidebar itself applies.
  const allowedKinds = useMemo(() => Object.keys(KINDS).filter((kind) => can(`${kind}:login`)), [can])
  const [kind, setKind] = useState(allowedKinds[0])
  const [partners, setPartners] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const debouncedSearch = useDebounced(search, 300)

  useEffect(() => {
    if (!kind) return undefined
    let active = true
    setPartners(null)
    setSelectedId(null)
    api
      .getPartners({ kind, status: 'approved', q: debouncedSearch })
      .then((result) => {
        if (active) setPartners(result)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [kind, debouncedSearch])

  if (!kind) {
    return (
      <EmptyState
        title="No partner kinds assigned"
        description="Ask an administrator to grant you a create-login permission for at least one kind."
      />
    )
  }

  const selected = partners?.find((p) => p.id === selectedId) || null

  return (
    <PageMotion>
      <PageHeader
        title="Partner Logins"
        subtitle="Create and manage the login an approved partner signs in to their own portal with."
      />

      <PageSection className="mb-4 flex flex-wrap gap-2">
        {allowedKinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={k === kind}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              k === kind ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            {KINDS[k].plural}
          </button>
        ))}
      </PageSection>

      <PageSection className="mb-4">
        <Input
          type="search"
          placeholder={`Search approved ${KINDS[kind].plural.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={`Search approved ${KINDS[kind].plural.toLowerCase()}`}
          className="sm:max-w-xs"
        />
      </PageSection>

      {error && (
        <PageSection>
          <Alert className="mb-4">{error}</Alert>
        </PageSection>
      )}

      <PageSection className="mb-4">
        {!partners ? (
          <LoadingState label="Loading approved partners…" />
        ) : partners.length === 0 ? (
          <EmptyState
            title={`No approved ${KINDS[kind].plural.toLowerCase()}`}
            description="A partner needs to be approved before a login can be created for them."
          />
        ) : (
          <Card className="divide-y divide-ink-100">
            {partners.map((partner) => (
              <button
                key={partner.id}
                type="button"
                onClick={() => setSelectedId(partner.id)}
                aria-pressed={selectedId === partner.id}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors hover:bg-brand-50 ${
                  selectedId === partner.id ? 'bg-brand-50' : ''
                }`}
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium text-ink-900">{partner.legalName || 'Untitled'}</span>
                  {partner.tradeName && <span className="ml-2 text-xs text-ink-400">{partner.tradeName}</span>}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-500">
                  {partner[KINDS[kind].idField] || '—'}
                </span>
              </button>
            ))}
          </Card>
        )}
      </PageSection>

      {selected && (
        <PageSection>
          <PortalAccessCard key={selected.id} partnerId={selected.id} kindLabel={KINDS[kind].label} />
        </PageSection>
      )}
    </PageMotion>
  )
}
