import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

// ● complete / ◐ partial / ○ empty. Glyphs rather than three SVGs: they line up in a
// column, they scale with the text and they survive a copy-paste of the page.
function dotFor(fill) {
  if (!fill || !fill.total) return { glyph: '○', className: 'text-ink-300' }
  if (fill.filled >= fill.total) return { glyph: '●', className: 'text-brand-600' }
  if (fill.filled === 0) return { glyph: '○', className: 'text-ink-300' }
  return { glyph: '◐', className: 'text-brand-400' }
}

// The section index. On md+ a sticky left rail; below md the same list behind a hamburger,
// because thirteen stacked rows above the form would push the first field off a phone.
export default function SectionRail({ sections, fills, errorCounts, activeId, onSelect }) {
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  // Mavio's internal checklist carries `permission`. Hiding it here is cosmetic — the
  // write endpoint enforces the same permission — but a rail row that scrolls to a section
  // the staffer cannot see is worse than no row.
  const visible = sections.filter((section) => !section.permission || can(section.permission))
  const current = visible.find((section) => section.id === activeId)

  return (
    <nav aria-label="Form sections" className="relative md:static">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 bg-surface px-3 py-2 text-left text-sm text-ink-700 md:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5 shrink-0 text-ink-500">
          <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="max-w-[38vw] truncate font-medium">
          {current ? `${current.number} ${current.title}` : 'Sections'}
        </span>
      </button>

      {/* Below md the trigger lives in the page header next to Submit, so the panel drops
          out of its left edge — right-aligned it hung off the side of the screen, since the
          trigger is only as wide as its own label. Plain rail from md up. */}
      <ul
        className={`${open ? 'block' : 'hidden'} absolute left-0 top-full z-30 mt-1 max-h-[60vh] w-64 max-w-[80vw] space-y-0.5 overflow-y-auto rounded-xl border border-ink-200 bg-surface p-1 shadow-lg md:static md:z-auto md:mt-0 md:block md:max-h-none md:w-auto md:max-w-none md:overflow-visible md:rounded-none md:border-0 md:p-0 md:shadow-none`}
      >
        {visible.map((section) => {
          const dot = dotFor(fills?.[section.id])
          const errors = errorCounts?.[section.id] || 0
          const active = section.id === activeId
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onSelect(section.id)
                }}
                aria-current={active ? 'true' : undefined}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  // brand-100 rather than 50: at 50 the active row was a tint you had to
                  // look for, and with the rail now tracking the scroll it is read at a
                  // glance or not at all.
                  active ? 'bg-brand-100 font-medium text-ink-900' : 'text-ink-600 hover:bg-ink-100'
                }`}
              >
                <span className={`shrink-0 text-xs ${dot.className}`} aria-hidden="true">
                  {dot.glyph}
                </span>
                <span className="shrink-0 tabular-nums text-xs text-ink-400">{section.number}</span>
                <span className="min-w-0 flex-1 truncate">{section.title}</span>
                {errors > 0 && (
                  <span
                    aria-label={`${errors} field(s) need attention`}
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700"
                  >
                    !
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
