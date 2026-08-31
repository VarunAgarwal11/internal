import { useAuth } from '../../context/AuthContext'

// ● complete / ◐ partial / ○ empty. Glyphs rather than three SVGs: they line up in a
// column, they scale with the text and they survive a copy-paste of the page.
function dotFor(fill) {
  if (!fill || !fill.total) return { glyph: '○', className: 'text-ink-300' }
  if (fill.filled >= fill.total) return { glyph: '●', className: 'text-brand-600' }
  if (fill.filled === 0) return { glyph: '○', className: 'text-ink-300' }
  return { glyph: '◐', className: 'text-brand-400' }
}

// The section index. On md+ a sticky left rail; below md a horizontally scrolling chip
// row, because thirteen stacked rows above the form would push the first field off a phone.
export default function SectionRail({ sections, fills, errorCounts, activeId, onSelect }) {
  const { can } = useAuth()
  // Mavio's internal checklist carries `permission`. Hiding it here is cosmetic — the
  // write endpoint enforces the same permission — but a rail row that scrolls to a section
  // the staffer cannot see is worse than no row.
  const visible = sections.filter((section) => !section.permission || can(section.permission))

  return (
    <nav aria-label="Form sections">
      <ul className="flex gap-2 overflow-x-auto pb-2 md:block md:space-y-0.5 md:overflow-visible md:pb-0">
        {visible.map((section) => {
          const dot = dotFor(fills?.[section.id])
          const errors = errorCounts?.[section.id] || 0
          const active = section.id === activeId
          return (
            <li key={section.id} className="shrink-0 md:shrink">
              <button
                type="button"
                onClick={() => onSelect(section.id)}
                aria-current={active ? 'true' : undefined}
                className={`flex w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-left text-sm transition-colors md:whitespace-normal md:rounded-xl ${
                  active ? 'bg-brand-50 text-ink-900' : 'text-ink-600 hover:bg-ink-100'
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
