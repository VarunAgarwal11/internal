import { Spinner } from '../ui/Primitives'

// Collapsible card around one section: number + title, a filled/total count, the autosave
// chip and an error badge.
//
// The body stays MOUNTED but `hidden` when collapsed, which is deliberate and load-bearing
// here in three ways: an upload in flight inside a section the staffer just collapsed is
// not torn down mid-request, half-typed state survives a collapse/expand, and the browser's
// own Ctrl+F still finds every field on a 150-field form. Unmounting would cost all three.
export default function SectionShell({
  anchorId,
  number,
  title,
  collapsed,
  onToggle,
  status,
  filled,
  total,
  errorCount = 0,
  children,
}) {
  return (
    <section id={anchorId} className="scroll-mt-4 rounded-2xl border border-ink-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <h2 className="min-w-0 flex-1 text-base font-semibold text-ink-900">
          <span className="mr-2 tabular-nums text-ink-400">{number}</span>
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          {errorCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {errorCount} to fix
            </span>
          )}
          {typeof total === 'number' && total > 0 && (
            <span className="text-sm tabular-nums text-ink-500">
              {filled}/{total}
            </span>
          )}
          {status === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-ink-500">
              <Spinner className="h-3.5 w-3.5" />
              Saving…
            </span>
          )}
          {status === 'saved' && <span className="text-xs font-medium text-brand-700">Saved ✓</span>}
          {status === 'error' && <span className="text-xs font-medium text-red-600">Save failed</span>}
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className={`h-4 w-4 text-ink-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          >
            <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      <div className={collapsed ? 'hidden' : 'border-t border-ink-100 px-5 py-4'}>{children}</div>
    </section>
  )
}
