import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { Alert, Button, Card, EmptyState, LoadingState, Textarea } from '../components/ui/Primitives'
import Modal from '../components/ui/Modal'
import SectionShell from '../components/form/SectionShell'
import ReadOnlySection from '../components/form/ReadOnlySection'
import { formatDate, formatDateTime } from '../utils/format'
import { visibleSpec } from '../utils/visibility'

// The partner's own view of the form Mavio filled in for them, opened from a link in an
// email. The ONLY page in this app with no session behind it: the token in the path is the
// whole credential.
//
// It never calls useAuth(). The boot getMe() 401 is inert — http.js excludes /auth/* from
// onAuthError, and the bounce to /login comes from ProtectedRoute, which this route sits
// outside. Its own chrome for the same reason: AppShell is a sidebar of links to screens
// that would all 401.
export default function PartnerReviewPage() {
  const { token } = useParams()
  const toast = useToast()
  const confirm = useConfirm()

  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [asking, setAsking] = useState(false)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    api
      .getReview(token)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err) => {
        // Unknown, expired and superseded all arrive here as one 404 carrying the sentence
        // to show. Without this the page sits on its spinner forever.
        if (active) setLoadError(err.message)
      })
    return () => {
      active = false
    }
  }, [token])

  // The same gates the server applied before validating, re-run against the stored answers:
  // a partner who does no customs clearing must not be shown a CHA licence row that was
  // never asked of them. `internal` is already stripped server-side; re-filtered here so
  // this page cannot start leaking Mavio's own assessment on a schema change alone.
  //
  // Memoised because the request-changes comment lives in page state — without it every
  // keystroke re-gates ~150 rows.
  const sections = useMemo(
    () => visibleSpec(data?.sections, data?.values).filter((section) => !section.internal),
    [data],
  )

  // Grouped once: ReadOnlySection takes one section's files, and a fresh array per section
  // per render would rebuild the whole page on each keystroke in the dialog.
  const filesBySection = useMemo(() => {
    const out = {}
    for (const file of data?.files || []) {
      if (!out[file.sectionId]) out[file.sectionId] = []
      out[file.sectionId].push(file)
    }
    return out
  }, [data?.files])

  async function respond(response, body) {
    setBusy(true)
    try {
      const updated = await api.respondToReview(token, { response, comment: body })
      setData(updated)
      setAsking(false)
      setComment('')
      toast.success('Thank you — your answer has been sent to Mavio.')
    } catch (err) {
      toast.error(err.message)
      // Already answered in another tab or on another device. Re-read rather than leave two
      // buttons on screen that will keep failing.
      if (err.code === 'already_responded') api.getReview(token).then(setData).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    const ok = await confirm({
      title: 'Confirm these details?',
      message: 'You are telling Mavio that everything shown here is correct. This link cannot be answered twice.',
      confirmLabel: 'Confirm',
    })
    if (ok) await respond('confirmed')
  }

  return (
    <div className="app-ambient-bg min-h-screen">
      <header className="border-b border-ink-200 bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            {/* The wordmark inline, as AuthCard does it — the only two screens without the
                shell around them. No theme toggle: index.html's pre-paint script already
                follows the reader's OS setting, and there is no account to store a choice on. */}
            <span className="font-semibold tracking-tight text-brand-700">
              Mavio<span className="text-ink-400"> Global</span>
            </span>
            {data && <p className="truncate text-sm text-ink-600">{data.legalName}</p>}
          </div>
          {data && (
            <Button as="a" variant="secondary" href={api.reviewPdfUrl(token)}>
              Download PDF
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-16 sm:px-6">
        {loadError ? (
          <EmptyState
            title="This link no longer works"
            description={`${loadError} Ask your Mavio contact to send you a new one.`}
          />
        ) : !data ? (
          <LoadingState label="Loading your details…" />
        ) : (
          <>
            {/* No kindLabel in the sentence: it is the role editor's plural group name
                ("Suppliers", "Logistics & CHA"), which reads as a filing cabinet rather
                than as a noun for the reader's own company. */}
            <h1 className="text-xl font-medium text-ink-900">Please check your onboarding details</h1>
            <p className="mt-1 mb-4 text-sm text-ink-600">
              Mavio filled this in from what you sent. Nothing here can be edited from this page — confirm it, or tell
              us what to change.
            </p>

            <div className="space-y-4">
              {sections.map((section) => (
                <SectionShell
                  key={section.id}
                  number={section.number}
                  title={section.title}
                  // Expanded by default: this is a document to read, not a form to work
                  // through, and 12 collapsed rows hide the very thing being confirmed.
                  collapsed={Boolean(collapsed[section.id])}
                  onToggle={() => setCollapsed((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                >
                  <ReadOnlySection
                    fields={section.fields}
                    value={data.values?.[section.id]}
                    documents={filesBySection[section.id]}
                  />
                </SectionShell>
              ))}
            </div>

            {/* One code path for "just answered" and "answered last week": the state comes
                from the record, not from a local flag, so a reload reads the same. */}
            {data.response === 'confirmed' ? (
              <Alert tone="success" className="mt-6">
                You confirmed these details on {formatDateTime(data.respondedAt)}. Nothing further is needed.
              </Alert>
            ) : data.response === 'changes_requested' ? (
              <Alert tone="info" className="mt-6">
                You asked for changes on {formatDateTime(data.respondedAt)}: “{data.comment}”. Mavio will correct the
                form and send it again.
              </Alert>
            ) : (
              <Card className="mt-6 p-5">
                {data.note && (
                  <p className="mb-4 whitespace-pre-line rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-700">
                    {data.note}
                  </p>
                )}
                <h2 className="text-base font-semibold text-ink-900">Are these details correct?</h2>
                <p className="mt-1 text-sm text-ink-600">
                  This link can be answered once, and works until {formatDate(data.expiresAt)}.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={handleConfirm} disabled={busy}>
                    Yes, these details are correct
                  </Button>
                  <Button variant="secondary" onClick={() => setAsking(true)} disabled={busy}>
                    Request changes
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </main>

      {asking && (
        <Modal title="Request changes" onClose={() => setAsking(false)}>
          <p className="mb-3 text-sm text-ink-600">
            Tell Mavio what is wrong or missing. They correct the form and send it to you again.
          </p>
          <Textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What needs changing?"
            aria-label="What needs changing?"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAsking(false)}>
              Cancel
            </Button>
            {/* The server rejects a blank comment too — "something is wrong" with no
                sentence after it is a message nobody can act on. */}
            <Button onClick={() => respond('changes_requested', comment.trim())} disabled={busy || !comment.trim()}>
              {busy ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
