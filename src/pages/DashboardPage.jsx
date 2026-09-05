import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Alert, Card, EmptyState, PageHeader, Spinner } from '../components/ui/Primitives'
import PageMotion, { MotionList, MotionRow } from '../components/ui/PageMotion'
import { KINDS } from '../config/kinds'

// One tile per area. Counts come from the same list endpoints the pages themselves call,
// counted here — ponytail: no /stats endpoint until a list is big enough that fetching the
// rows to count them costs something.
const TILES = [
  ...Object.entries(KINDS).map(([kind, { path, plural }]) => ({
    key: kind,
    label: plural,
    to: path,
    permission: `${kind}:read`,
    load: () => api.getPartners({ kind }),
  })),
  { key: 'users', label: 'Users', to: '/admin/users', permission: 'user:manage', load: () => api.getUsers() },
]

export default function DashboardPage() {
  const { can, user } = useAuth()
  // Same rule as the sidebar: a tile whose page the user cannot open would only be a
  // number they are not allowed to act on. The endpoints re-check server-side anyway.
  const tiles = TILES.filter((tile) => can(tile.permission))
  // null = still counting; a per-tile map so one failing endpoint does not blank the rest.
  const [counts, setCounts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all(
      tiles.map((tile) =>
        tile
          .load()
          .then((rows) => [tile.key, rows.length])
          .catch(() => [tile.key, null])
      )
    ).then((entries) => {
      if (!active) return
      setCounts(Object.fromEntries(entries))
      setError(entries.some(([, n]) => n === null) ? 'Some counts could not be loaded.' : '')
    })
    return () => {
      active = false
    }
    // `can` is memoised on the user, so this runs once per sign-in, not per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [can])

  return (
    <PageMotion>
      <PageHeader title="Dashboard" subtitle={user?.fullName ? `Signed in as ${user.fullName}` : undefined} />

      {error && <Alert className="mb-4">{error}</Alert>}

      {tiles.length === 0 ? (
        <EmptyState title="No sections assigned" description="Ask an administrator to assign you a role." />
      ) : (
        <MotionList className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((tile) => (
            <MotionRow key={tile.key}>
              <Card className="h-full p-5 transition-shadow hover:shadow-md">
                <Link to={tile.to} className="block">
                  <p className="text-sm font-medium text-ink-500">{tile.label}</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-ink-900">
                    {counts ? (counts[tile.key] ?? '—') : <Spinner className="h-6 w-6" />}
                  </p>
                  <p className="mt-3 text-xs font-medium text-brand-700">View all →</p>
                </Link>
              </Card>
            </MotionRow>
          ))}
        </MotionList>
      )}
    </PageMotion>
  )
}
