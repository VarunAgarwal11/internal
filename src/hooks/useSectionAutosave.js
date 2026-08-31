import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../services/api'

const DEBOUNCE_MS = 800
const SAVED_CHIP_MS = 2000

// 800 ms-debounced autosave for the whole onboarding form: ONE request carrying every
// section that changed, not one request per section. Reference identity is enough to
// spot a dirty section — every edit path spreads into a fresh object — so the dirty set
// is whatever no longer matches the last saved snapshot.
//
// `internalSectionId` is the spec's `internal: true` section (Mavio's own checklist).
// It is stored in its own column behind its own permission, and the sections PATCH
// rejects it outright, so it is routed to api.saveVerification instead. It still rides
// in the same `sections` object, which is the only reason the renderer can treat it like
// any other section.
//
// THE BUG THIS FIXES (ported from KIORA's useIntakeAutosave, which has it): the debounced
// save had no `.catch`. A network blip therefore became an unhandled rejection, the
// section chip sat on "Saving…" forever, and the edit was gone with nothing on screen
// saying so. On a 150-field form filled in over several sittings, a silently-dropped save
// is the single worst thing this app can do — so every failure is caught, kept in
// `error`, retried by the next flush, and lets the page disable Submit until it clears.
export function useSectionAutosave(partnerId, sections, internalSectionId) {
  const [state, setState] = useState({ status: 'idle', keys: [], error: null })
  const savedRef = useRef(null)
  const timerRef = useRef(null)
  const idleTimerRef = useRef(null)
  const flushRef = useRef(null)
  const inFlightRef = useRef(null)

  const save = useCallback(
    (payload) => {
      const calls = []
      const supplierSections = Object.fromEntries(
        Object.entries(payload).filter(([key]) => key !== internalSectionId),
      )
      if (Object.keys(supplierSections).length) calls.push(api.saveSections(partnerId, supplierSections))
      if (internalSectionId && internalSectionId in payload) {
        calls.push(api.saveVerification(partnerId, payload[internalSectionId]))
      }
      return Promise.all(calls)
    },
    [partnerId, internalSectionId],
  )

  // Navigating away inside the debounce window would otherwise discard the last edit.
  // Fire-and-forget is safe here only because `run` resolves instead of rejecting.
  useEffect(() => () => flushRef.current?.(), [])

  useEffect(() => {
    if (!sections) return undefined
    if (savedRef.current?.partnerId !== partnerId) {
      // The load from the server, not an edit — it already IS what the server has.
      savedRef.current = { partnerId, sections }
      return undefined
    }

    const dirty = Object.keys(sections).filter((key) => sections[key] !== savedRef.current.sections[key])
    if (!dirty.length) return undefined

    const payload = Object.fromEntries(dirty.map((key) => [key, sections[key]]))

    // Resolves to the error rather than rejecting, so the unmount call above and the
    // page's `await flush()` share one code path and neither can mint the unhandled
    // rejection this hook exists to kill.
    const run = () => {
      clearTimeout(timerRef.current)
      flushRef.current = null // claimed: a second flush must not send the same payload twice
      setState({ status: 'saving', keys: dirty, error: null })
      const promise = save(payload)
        .then(() => {
          savedRef.current = { partnerId, sections: { ...savedRef.current.sections, ...payload } }
          setState({ status: 'saved', keys: dirty, error: null })
          clearTimeout(idleTimerRef.current)
          idleTimerRef.current = setTimeout(() => setState((s) => ({ ...s, status: 'idle' })), SAVED_CHIP_MS)
          return null
        })
        .catch((err) => {
          // Still unsaved: put the payload back so the next flush (Submit, unmount, or the
          // banner's Retry) tries it again, and leave savedRef untouched so the section
          // stays dirty and any further keystroke re-sends it too.
          flushRef.current = run
          setState({ status: 'error', keys: dirty, error: err })
          return err
        })
      inFlightRef.current = promise
      return promise
    }

    flushRef.current = run
    timerRef.current = setTimeout(run, DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
  }, [partnerId, sections, save])

  // Awaited before Submit: a value typed in the last 800 ms is not on the server yet, and
  // submitting would validate the version without it. Resolves to null on success or the
  // error on failure — the caller must not submit on a non-null result.
  const flush = useCallback(() => {
    if (flushRef.current) return flushRef.current()
    // Nothing pending, but a save may still be in the air; submitting past it would race.
    return inFlightRef.current || Promise.resolve(null)
  }, [])

  return {
    // Per-section chip state, so each SectionShell shows its own Saving…/Saved ✓/failed.
    statuses: Object.fromEntries(state.keys.map((key) => [key, state.status])),
    saving: state.status === 'saving',
    error: state.error,
    flush,
  }
}
