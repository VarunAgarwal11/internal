import { useState } from 'react'
import Field from './Field'
import { Button } from '../ui/Primitives'
import { useConfirm } from '../../context/ConfirmContext'
import { isFilled } from '../../utils/fill'
import { clearStaleDependents } from '../../utils/options'

// Duplicated from SectionForm rather than shared: react/only-export-components forbids a
// second export next to a component, and a one-line Set is cheaper than a module for it.
const FULL_WIDTH = new Set(['textarea', 'group', 'file', 'multiselect'])

function ChevronIcon({ open }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}>
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      // 28px is a mouse target, not a thumb one, and three of these sit shoulder to
      // shoulder with a destructive delete on the end. Full size on a phone, dense again
      // from sm up where the card header has less room to give.
      className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
    >
      {children}
    </button>
  )
}

// The `group` field type: a list of repeating rows, one collapsible card each.
//
// Every row carries a client-minted crypto.randomUUID() `id`, which the backend
// deliberately preserves. It is the React key, and index keys would be a bug, not a
// nitpick: on a remove or a move, React hands row 2's DOM — its focus, its scroll, its
// half-typed value — to row 1, so deleting product 1 visibly wipes the field the staffer
// was typing in on product 2.
export default function GroupRepeater({
  field,
  path,
  scope,
  value,
  onChange,
  errors,
  documents,
  partnerId,
  onUpload,
  onRemoveFile,
  disabled,
}) {
  const confirm = useConfirm()
  const [open, setOpen] = useState({})
  const rows = Array.isArray(value) ? value : []
  const subFields = field.fields || []
  // ponytail: "Products" -> "Product". Good enough for every label on this form; if the
  // spec ever grows an irregular plural, add a `singular` key to SpecField.
  const singular = field.label.replace(/s$/, '') || 'Item'
  // The spec names the field a human recognises the row by. The old "first text field"
  // rule only held while that field happened to be text — once product_name became a
  // select, it silently retitled every card by its SKU.
  const titleField = subFields.find((sub) => sub.title) || subFields.find((sub) => (sub.type || 'text') === 'text')
  const errorKeys = Object.keys(errors || {})

  function rowHasError(index) {
    const prefix = `${path}[${index}]`
    return errorKeys.some((key) => key === prefix || key.startsWith(`${prefix}.`))
  }

  function addRow() {
    const row = { id: crypto.randomUUID() }
    setOpen((state) => ({ ...state, [row.id]: true }))
    onChange([...rows, row])
  }

  function move(index, delta) {
    const next = rows.slice()
    const [row] = next.splice(index, 1)
    next.splice(index + delta, 0, row)
    onChange(next)
  }

  // Autosave means a mis-clicked remove is on the server 800 ms later, so a card with
  // answers in it asks first. A card that is still blank just goes.
  async function removeRow(index) {
    const answers = Object.entries(rows[index])
      .filter(([key]) => key !== 'id')
      .map(([, entry]) => entry)
    if (answers.some(isFilled)) {
      const ok = await confirm({
        title: `Remove this ${singular.toLowerCase()}?`,
        message: 'Everything filled in on this card is deleted.',
        confirmLabel: 'Remove',
        tone: 'danger',
      })
      if (!ok) return
    }
    onChange(rows.filter((_, position) => position !== index))
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink-800">
          {field.label}
          {field.required && (
            <span className="ml-0.5 text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </h3>
        <span className="text-xs text-ink-500">{rows.length} added</span>
      </div>

      {/* The group's own error — "Expected a list of entries.", or the required-on-submit
          message when there are no rows at all. It has nowhere else to land. */}
      {errors?.[path] && <p className="mb-2 text-sm text-red-600">{errors[path]}</p>}

      <div className="space-y-3">
        {rows.map((row, index) => {
          const hasError = rowHasError(index)
          // A card holding a server error opens itself: an error on a collapsed card is a
          // red badge pointing at nothing.
          const expanded = Boolean(open[row.id]) || hasError
          const title = (titleField && row[titleField.key]) || `${singular} ${index + 1}`
          return (
            <div
              key={row.id}
              className={`rounded-2xl border bg-surface ${hasError ? 'border-red-300' : 'border-ink-200'}`}
            >
              <div className="flex items-center gap-1 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setOpen((state) => ({ ...state, [row.id]: !expanded }))}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                  aria-expanded={expanded}
                >
                  <ChevronIcon open={expanded} />
                  <span className="truncate text-sm font-medium text-ink-800">{title}</span>
                </button>
                {/* ponytail: move buttons, not drag-and-drop. A 19-field card is far taller
                    than the viewport, so dragging it means an auto-scrolling drop target,
                    and DnD would be this app's first dependency added for a nicety. If
                    reordering ever becomes frequent, @dnd-kit/sortable over this same
                    `id`-keyed array is the upgrade. */}
                <IconButton label="Move up" disabled={disabled || index === 0} onClick={() => move(index, -1)}>
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                    <path d="M5 12.5l5-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </IconButton>
                <IconButton
                  label="Move down"
                  disabled={disabled || index === rows.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                    <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </IconButton>
                <IconButton label={`Remove ${title}`} disabled={disabled} onClick={() => removeRow(index)}>
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                    <path
                      d="M7 4h6M4.5 6.5h11M6.5 6.5l.6 9h5.8l.6-9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </IconButton>
              </div>

              {/* Mounted while collapsed, same as SectionShell: a card can hold a file
                  field, and an upload in flight inside a card the staffer just collapsed
                  must not be torn down mid-request. */}
              <div className={expanded ? 'grid gap-4 border-t border-ink-100 px-4 py-4 sm:grid-cols-2' : 'hidden'}>
                {subFields.map((sub) => (
                  <div key={sub.key} className={FULL_WIDTH.has(sub.type) ? 'sm:col-span-2' : ''}>
                    <Field
                      field={sub}
                      path={`${path}[${index}].${sub.key}`}
                      scope={scope}
                      value={row[sub.key]}
                      // Row-scoped: the category on THIS card narrows this card's product
                      // menu, and clears its product when it changes. See utils/options.
                      siblings={row}
                      onChange={(next) =>
                        onChange(
                          rows.map((entry, position) =>
                            position === index
                              ? clearStaleDependents(subFields, { ...entry, [sub.key]: next })
                              : entry,
                          ),
                        )
                      }
                      errors={errors}
                      documents={documents}
                      itemIndex={index}
                      partnerId={partnerId}
                      onUpload={onUpload}
                      onRemoveFile={onRemoveFile}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Button type="button" variant="secondary" className="mt-3" disabled={disabled} onClick={addRow}>
        + Add {singular.toLowerCase()}
      </Button>
    </div>
  )
}
