import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastContext = createContext(null)

const TONE_STYLES = {
  success: 'toast-success',
  error: 'toast-error',
  info: 'toast-info',
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      <AnimatePresence initial={false}>
        {toasts.map((entry) => (
          <motion.div
            key={entry.id}
            role="status"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg ${TONE_STYLES[entry.tone] || TONE_STYLES.info}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 font-medium leading-snug">{entry.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(entry.id)}
                aria-label="Dismiss notification"
                className="cursor-pointer shrink-0 rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, tone = 'info', durationMs = 4000) => {
      const text = typeof message === 'string' ? message.trim() : ''
      if (!text) return null
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      setToasts((current) => [...current, { id, message: text, tone }])
      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs)
      }
      return id
    },
    [dismiss]
  )

  const toast = useMemo(
    () => ({
      show: push,
      success: (message, durationMs) => push(message, 'success', durationMs),
      error: (message, durationMs) => push(message, 'error', durationMs),
      info: (message, durationMs) => push(message, 'info', durationMs),
      dismiss,
    }),
    [push, dismiss]
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
