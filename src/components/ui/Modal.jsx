import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Callers mount/unmount this conditionally (`{open && <Modal ... />}`).
// Portals stay on document.body as plain DOM — wrapping them in framer-motion
// caused removeChild errors when the dialog unmounted.
//
// `dismissible={false}` drops all three ways out — Escape, the backdrop, and the X.
// That is for a modal reporting work already in flight, where closing would only hide
// the explanation while the work carried on regardless.
export default function Modal({
  title,
  onClose,
  children,
  dismissible = true,
  maxWidthClassName = 'max-w-lg',
  ariaLabel,
  panelClassName = '',
}) {
  useEffect(() => {
    if (!dismissible) return undefined
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, dismissible])

  // The app scrolls an inner panel (`[data-app-scroll]`), not the document — locking
  // body overflow alone still lets the form behind the dialog move.
  useEffect(() => {
    const scrollers = [document.documentElement, document.body, ...document.querySelectorAll('[data-app-scroll]')]
    const previous = scrollers.map((el) => [el, el.style.overflow])
    scrollers.forEach((el) => {
      el.style.overflow = 'hidden'
    })

    function inDialog(target) {
      return target instanceof Element && Boolean(target.closest('[role="dialog"]'))
    }
    function blockBackgroundScroll(e) {
      if (!inDialog(e.target)) e.preventDefault()
    }
    document.addEventListener('wheel', blockBackgroundScroll, { passive: false })
    document.addEventListener('touchmove', blockBackgroundScroll, { passive: false })

    return () => {
      previous.forEach(([el, overflow]) => {
        el.style.overflow = overflow
      })
      document.removeEventListener('wheel', blockBackgroundScroll)
      document.removeEventListener('touchmove', blockBackgroundScroll)
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/50 p-4">
      {dismissible && (
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute inset-0 h-full w-full cursor-default"
          onClick={onClose}
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || ariaLabel || 'Dialog'}
        // dvh, not vh: with a phone's address bar showing, 90vh is taller than the visible
        // area, so a long dialog's own footer buttons sat below the fold with nothing to
        // scroll — the panel had not overflowed as far as the browser was concerned.
        className={`relative max-h-[90dvh] w-full overflow-y-auto rounded-3xl border border-ink-200 bg-surface p-6 shadow-lg sm:p-7 ${maxWidthClassName} ${panelClassName}`}
      >
        {(title || dismissible) && (
          <div className={`mb-4 flex items-start ${title ? 'justify-between gap-3' : 'justify-end'}`}>
            {title && <h2 className="pt-0.5 text-lg font-medium leading-snug text-ink-900">{title}</h2>}
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cursor-pointer rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
