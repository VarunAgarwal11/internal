import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { Alert, Button, LoadingState, ProgressBar, Textarea } from '../components/ui/Primitives'
import Modal from '../components/ui/Modal'
import PageMotion from '../components/ui/PageMotion'
import { PartnerStatusBadge } from '../components/Badges'
import SectionForm from '../components/form/SectionForm'
import SectionRail from '../components/form/SectionRail'
import SectionShell from '../components/form/SectionShell'
import { useSectionAutosave } from '../hooks/useSectionAutosave'
import { fieldDomId } from '../utils/fieldId'
import { sectionFill } from '../utils/fill'
import { visibleSpec } from '../utils/visibility'
import { KINDS } from '../config/kinds'

const anchorFor = (sectionId) => `section-${sectionId}`

// Mirrors the backend's _file_field(): one level of nesting, groups included. Needed only
// to know whether an upload REPLACES the row already in its slot.
//
// Searches the UNGATED spec on purpose. The server accepts an upload against a currently
// hidden field (turning a service off and back on has to be lossless), so resolving it
// here against the gated spec would lose the `multiple` flag and mis-handle the replace.
function findFileField(spec, sectionId, fieldKey) {
  const section = spec?.sections?.find((entry) => entry.id === sectionId)
  for (const field of section?.fields || []) {
    if (field.key === fieldKey) return field
    const sub = (field.fields || []).find((entry) => entry.key === fieldKey)
    if (sub) return sub
  }
  return null
}

// Serves /suppliers/:id, /buyers/:id and /logistics-cha/:id. The renderer underneath (SectionForm,
// Field, GroupRepeater, FileField) already reads everything it needs — labels, types,
// options, permissions — from the spec the backend sends for this `kind`; nothing here
// or below it hardcodes a field name, which is what makes this one component correct for
// both forms with zero per-kind branching in the parts that actually render inputs.
export default function PartnerFormPage({ kind }) {
  const { partnerId } = useParams()
  const { can, bootstrapping } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()

  const headerRef = useRef(null)
  const [spec, setSpec] = useState(null)
  const [partner, setPartner] = useState(null)
  const [sections, setSections] = useState(null)
  const [loadError, setLoadError] = useState('')
  // The flat `{ "<sectionId>.<fieldPath>": message }` map exactly as the server sent it.
  const [submitErrors, setSubmitErrors] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [activeId, setActiveId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([api.getFormSpec(kind), api.getPartner(partnerId)])
      .then(([specResult, partnerResult]) => {
        if (!active) return
        const internal = specResult.sections.find((section) => section.internal)
        setSpec(specResult)
        setPartner(partnerResult)
        // The internal checklist lives in its own column, not in partner.sections, but it
        // rides in the same object here so the renderer can treat it like any other
        // section. useSectionAutosave routes it back out to its own endpoint.
        setSections({
          ...partnerResult.sections,
          ...(internal ? { [internal.id]: partnerResult.verification || {} } : {}),
        })
        setCollapsed(Object.fromEntries(specResult.sections.map((section, index) => [section.id, index > 0])))
      })
      .catch((err) => {
        // Without this the page sits on its spinner forever when the API is down. No toast
        // to go with it: the banner replaces the whole page, so a second copy of the same
        // sentence floating over it is noise — and `toast` in this effect's deps would
        // re-fetch the form on every render if the context ever stops memoising it.
        if (active) setLoadError(err.message)
      })
    return () => {
      active = false
    }
  }, [kind, partnerId])

  const internalId = useMemo(() => spec?.sections.find((section) => section.internal)?.id ?? null, [spec])
  const { statuses, saving, error: saveError, flush } = useSectionAutosave(partnerId, sections, internalId)

  // A rejected section save carries the same per-field map a rejected submit does, so it is
  // shown the same way rather than as a bare banner nobody can act on. Derived, not copied
  // into state by an effect: the autosave's error is already state, and mirroring it would
  // be a second render pass plus a copy that can go stale.
  const serverErrors = saveError?.errors ?? submitErrors

  // Sliced into per-section maps EXACTLY ONCE, here. This is the whole reason SectionForm
  // and Field never learn that sections exist above them — and it is what lets these same
  // components render both the supplier and the buyer form with no change below this line.
  const errorsBySection = useMemo(() => {
    const out = {}
    for (const [key, message] of Object.entries(serverErrors || {})) {
      const dot = key.indexOf('.')
      const sectionId = dot === -1 ? key : key.slice(0, dot)
      const path = dot === -1 ? '' : key.slice(dot + 1)
      if (!out[sectionId]) out[sectionId] = {}
      out[sectionId][path] = message
    }
    return out
  }, [serverErrors])

  const errorCounts = useMemo(
    () => Object.fromEntries(Object.entries(errorsBySection).map(([id, map]) => [id, Object.keys(map).length])),
    [errorsBySection],
  )

  // Grouped once and memoised: SectionForm is memo()'d, and a fresh array per section per
  // render would defeat it on every keystroke.
  const docsBySection = useMemo(() => {
    const out = {}
    for (const doc of partner?.documents || []) {
      if (!out[doc.sectionId]) out[doc.sectionId] = []
      out[doc.sectionId].push(doc)
    }
    return out
  }, [partner?.documents])

  // The spec's own gates, re-evaluated against live form state so the form reacts as the
  // staffer answers: a partner who forwards cargo but does no customs clearing must not be
  // shown — or blocked at submit by — a CHA licence number they will never hold. Same rule
  // as the server's visible_spec(), which drops the same nodes before validating.
  const gatedSections = useMemo(
    () => (spec ? visibleSpec(spec.sections, sections) : []),
    [spec, sections],
  )

  const visibleSections = useMemo(
    () => gatedSections.filter((section) => !section.permission || can(section.permission)),
    [gatedSections, can],
  )

  // Joined into one string on purpose: `visibleSections` is a new array on every keystroke
  // (it derives from live form state through the gates), and the scroll effect below must
  // re-subscribe only when the set of sections actually changes.
  const railIds = useMemo(() => visibleSections.map((section) => section.id).join(','), [visibleSections])

  // Scroll spy for the rail: the section the reader is looking at is the first one whose
  // bottom is still below the sticky header. Measured off the header's own box rather than
  // a magic offset — it grows a row when the action buttons wrap on a narrow screen.
  //
  // A scroll listener rather than IntersectionObserver: a collapsed section is one ~57px
  // row, so several sit inside any sensible observer band at once and choosing between them
  // is this same rect comparison anyway — plus re-observing the element set every time a
  // gate toggles. Bounded work, and `find` stops at the active section rather than
  // measuring all 18.
  useEffect(() => {
    const scroller = document.querySelector('[data-app-scroll]')
    if (!scroller || !railIds) return undefined
    const ids = railIds.split(',')

    const onScroll = () => {
      const line = headerRef.current?.getBoundingClientRect().bottom ?? 0
      const current = ids.find((id) => {
        const el = document.getElementById(anchorFor(id))
        return el && el.getBoundingClientRect().bottom > line
      })
      // Nothing left below the line means the last section's end has gone past it too —
      // the reader is at the foot of the form, which is still that section.
      setActiveId(current ?? ids[ids.length - 1])
    }

    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [railIds])

  const fills = useMemo(() => {
    if (!sections) return {}
    return Object.fromEntries(
      visibleSections.map((section) => [
        section.id,
        sectionFill(section, sections[section.id], docsBySection[section.id]),
      ]),
    )
  }, [visibleSections, sections, docsBySection])

  // The partner's own progress. The internal checklist is Mavio's work, not theirs, and
  // counting it would leave the bar short of 100% on a form with nothing left to fill in.
  const overall = useMemo(() => {
    let filled = 0
    let total = 0
    for (const section of visibleSections) {
      if (section.internal) continue
      const fill = fills[section.id]
      filled += fill?.filled || 0
      total += fill?.total || 0
    }
    return total ? Math.round((filled / total) * 100) : 0
  }, [visibleSections, fills])

  const handleSectionChange = useCallback((sectionKey, next) => {
    setSections((prev) => ({ ...prev, [sectionKey]: next }))
  }, [])

  const handleUpload = useCallback(
    async (sectionId, fieldKey, itemIndex, file) => {
      const doc = await api.uploadDocument(partnerId, { sectionId, fieldKey, itemIndex, file })
      const field = findFileField(spec, sectionId, fieldKey)
      const sameSlot = (entry) =>
        entry.sectionId === sectionId && entry.fieldKey === fieldKey && (entry.itemIndex ?? null) === (itemIndex ?? null)
      setPartner((prev) => ({
        ...prev,
        // A single-file field REPLACES server-side (documents.py deletes the old row), so
        // the old row has to go here too or the list keeps showing a file that is gone.
        documents: [...prev.documents.filter((entry) => (field?.multiple ? entry.id !== doc.id : !sameSlot(entry))), doc],
      }))
    },
    [partnerId, spec],
  )

  const handleRemoveFile = useCallback(
    async (doc) => {
      // A statutory certificate is a mis-click away from gone, and the delete is immediate.
      const ok = await confirm({
        title: `Remove ${doc.originalName || 'this file'}?`,
        message: 'The uploaded file is deleted and will have to be uploaded again.',
        confirmLabel: 'Remove',
        tone: 'danger',
      })
      if (!ok) return
      await api.deleteDocument(partnerId, doc.id)
      setPartner((prev) => ({ ...prev, documents: prev.documents.filter((entry) => entry.id !== doc.id) }))
    },
    [partnerId, confirm],
  )

  function expandAndScroll(sectionId, errorKey) {
    setCollapsed((prev) => ({ ...prev, [sectionId]: false }))
    setActiveId(sectionId)
    // Next frame, after the body has un-hidden: a `hidden` element has no box, so
    // scrollIntoView on anything inside it does nothing at all.
    requestAnimationFrame(() => {
      const target = errorKey && document.getElementById(fieldDomId(errorKey))
      if (target) {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
        target.focus?.({ preventScroll: true })
        return
      }
      document.getElementById(anchorFor(sectionId))?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  async function handleSubmit() {
    setBusy(true)
    try {
      // Flush FIRST. A value typed in the last 800 ms is still sitting in the debounce, and
      // submitting would validate the version of the form without it — the same reason the
      // hook flushes on unmount. A non-null result means the save failed; submitting on top
      // of that would approve a record missing the staffer's last edit.
      const failed = await flush()
      if (failed) {
        toast.error(`Your last change has not saved yet: ${failed.message}`)
        return
      }
      const updated = await api.submitPartner(partnerId)
      setPartner(updated)
      setSubmitErrors(null)
      toast.success('Submitted for review.')
    } catch (err) {
      if (err.errors) {
        setSubmitErrors(err.errors)
        const first = Object.keys(err.errors)[0]
        if (first) expandAndScroll(first.split('.')[0], first)
      }
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove() {
    const ok = await confirm({
      title: `Approve this ${KINDS[kind].label}?`,
      message: `They become an approved Mavio partner. Correcting an approved record means rejecting it first.`,
      confirmLabel: 'Approve',
    })
    if (!ok) return
    setBusy(true)
    try {
      setPartner(await api.approvePartner(partnerId))
      toast.success(`${KINDS[kind].label} approved.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    setBusy(true)
    try {
      setPartner(await api.rejectPartner(partnerId, reason.trim()))
      setRejecting(false)
      setReason('')
      toast.success('Sent back for correction.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loadError) return <Alert>{loadError}</Alert>
  if (bootstrapping || !spec || !partner || !sections) return <LoadingState label={`Loading ${KINDS[kind].label} form…`} />

  const status = partner.status
  // One page serves read and edit — there is no separate view route — so "read-only" is a
  // prop on every field rather than a different screen. Cosmetic: every write endpoint
  // enforces the same rule.
  const readOnly = !can(`${kind}:edit`) || status === 'submitted' || status === 'approved'
  // The internal section already declares its own gate (`section.permission` — asserted
  // server-side to equal f"{kind}:approve" for every kind), so it is read from the spec
  // here rather than re-typed as a literal. One source of truth for "who may approve and
  // who may write the checklist", not a spec-driven one and a hardcoded one that a future
  // kind's spec could disagree with.
  const internalSection = visibleSections.find((section) => section.internal)
  const canDecide = can(internalSection?.permission)

  return (
    <PageMotion>
      {/* top-0: the scrollport is the app pane, and offsets are measured from it. The ref
          is the scroll spy's reference line — see the effect above. */}
      <div ref={headerRef} className="sticky top-0 z-20 -mx-4 mb-4 border-b border-ink-100 bg-surface px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-medium text-ink-900">{partner.legalName || `Untitled ${KINDS[kind].label}`}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
              <PartnerStatusBadge status={status} />
              <span>{overall}% complete</span>
              {saving && <span>Saving…</span>}
              {!saving && !saveError && <span>All changes saved</span>}
              {saveError && <span className="font-medium text-red-600">Save failed</span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {!readOnly && (
              <Button
                onClick={handleSubmit}
                // Submit stays out of reach while a save is failing: the server would
                // validate a version of the form that is missing the last edit.
                disabled={busy || saving || Boolean(saveError)}
              >
                {busy ? 'Working…' : 'Submit for review'}
              </Button>
            )}
            {canDecide && status === 'submitted' && (
              <Button onClick={handleApprove} disabled={busy}>
                Approve
              </Button>
            )}
            {canDecide && (status === 'submitted' || status === 'approved') && (
              <Button variant="danger" onClick={() => setRejecting(true)} disabled={busy}>
                Reject
              </Button>
            )}
          </div>
        </div>
        <ProgressBar pct={overall} className="mt-3" />
      </div>

      {saveError && (
        <Alert className="mb-4">
          Your last change could not be saved: {saveError.message}{' '}
          <button type="button" onClick={() => flush()} className="cursor-pointer font-medium underline">
            Retry
          </button>
        </Alert>
      )}

      {status === 'rejected' && partner.rejectionReason && (
        <Alert className="mb-4">Sent back for correction: {partner.rejectionReason}</Alert>
      )}

      {(partner.warnings || []).map((warning) => (
        <Alert key={warning} tone="info" className="mb-4">
          {warning}
        </Alert>
      ))}

      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <aside className="md:w-60 md:shrink-0">
          <div className="md:sticky md:top-28">
            <SectionRail
              sections={gatedSections}
              fills={fills}
              errorCounts={errorCounts}
              activeId={activeId}
              onSelect={(sectionId) => expandAndScroll(sectionId, null)}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4 pb-24">
          {visibleSections.map((section) => (
            <SectionShell
              key={section.id}
              anchorId={anchorFor(section.id)}
              number={section.number}
              title={section.title}
              collapsed={Boolean(collapsed[section.id])}
              onToggle={() => setCollapsed((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
              status={statuses[section.id]}
              filled={fills[section.id]?.filled}
              total={fills[section.id]?.total}
              errorCount={errorCounts[section.id]}
            >
              <SectionForm
                sectionId={section.id}
                fields={section.fields}
                value={sections[section.id]}
                onChange={handleSectionChange}
                errors={errorsBySection[section.id]}
                documents={docsBySection[section.id]}
                partnerId={partnerId}
                onUpload={handleUpload}
                onRemoveFile={handleRemoveFile}
                // The internal checklist follows its own permission and its own endpoint:
                // it stays writable after submit, which is exactly when it gets filled in.
                disabled={section.internal ? !can(internalSection?.permission) : readOnly}
              />
            </SectionShell>
          ))}
        </div>
      </div>

      {rejecting && (
        <Modal title="Send back for correction" onClose={() => setRejecting(false)}>
          <p className="mb-3 text-sm text-ink-600">
            The reason is stored on the record and is what the staffer correcting it will read.
          </p>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What needs correcting?"
            aria-label="Rejection reason"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            {/* The server rejects a blank reason too — a rejection with no reason is a
                record nobody can act on. */}
            <Button variant="danger" onClick={handleReject} disabled={busy || !reason.trim()}>
              {busy ? 'Working…' : 'Reject'}
            </Button>
          </div>
        </Modal>
      )}
    </PageMotion>
  )
}
