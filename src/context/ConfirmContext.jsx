import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Modal from '../components/ui/Modal'
import { Button } from '../components/ui/Primitives'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [pending, setPending] = useState(null)

  const confirm = useCallback(
    ({
      title = 'Are you sure?',
      message = '',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      tone = 'default',
      // Modal portals to document.body, so a dialog opened from a scope that redefines
      // the brand tokens escapes it. Callers on those screens pass the scope class back in.
      className = '',
    }) =>
      new Promise((resolve) => {
        setPending({ title, message, confirmLabel, cancelLabel, tone, className, resolve })
      }),
    []
  )

  function close(result) {
    pending?.resolve(result)
    setPending(null)
  }

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <Modal
          title={pending.title}
          onClose={() => close(false)}
          maxWidthClassName="max-w-md"
          panelClassName={pending.className}
        >
          {pending.message && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{pending.message}</p>
          )}
          <div className={`flex justify-end gap-2 ${pending.message ? 'mt-6' : ''}`}>
            <Button variant="secondary" onClick={() => close(false)}>
              {pending.cancelLabel}
            </Button>
            <Button variant={pending.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
              {pending.confirmLabel}
            </Button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx.confirm
}
