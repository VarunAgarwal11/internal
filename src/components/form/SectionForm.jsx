import { memo } from 'react'
import Field from './Field'
import { Alert } from '../ui/Primitives'

// Textareas, groups, upload zones and checkbox grids get the full width: a 3-row textarea
// or a stack of product cards squeezed into half a row is unreadable.
const FULL_WIDTH = new Set(['textarea', 'group', 'file', 'multiselect'])

// One section's fields, rendered from the spec and nothing else.
//
// `onChange(sectionKey, nextSectionValue)` rather than `onChange(nextSectionValue)` so the
// page can hand ONE useCallback'd handler to all thirteen sections instead of minting
// thirteen closures on every keystroke — which is the whole reason the memo() below bites.
function SectionForm({
  sectionId,
  fields,
  value,
  onChange,
  errors,
  documents,
  partnerId,
  onUpload,
  onRemoveFile,
  disabled,
}) {
  const data = value || {}

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* A section-level message ("Unknown section.", "Expected an object.") arrives keyed
          to the section with an empty field path. Without this it would be swallowed. */}
      {errors?.[''] && <Alert className="sm:col-span-2">{errors['']}</Alert>}

      {fields.map((field) => (
        <div key={field.key} className={FULL_WIDTH.has(field.type) ? 'sm:col-span-2' : ''}>
          <Field
            field={field}
            path={field.key}
            scope={sectionId}
            value={data[field.key]}
            onChange={(next) => onChange(sectionId, { ...data, [field.key]: next })}
            errors={errors}
            documents={documents}
            partnerId={partnerId}
            onUpload={(fieldKey, itemIndex, file) => onUpload(sectionId, fieldKey, itemIndex, file)}
            onRemoveFile={onRemoveFile}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  )
}

// ~150 controlled inputs, plus 19 more per product card, are ALL mounted at once —
// collapsed section bodies stay in the DOM under `hidden` so the browser's own Ctrl+F
// still finds any field on the form. Without this memo, one keystroke in section 01
// re-renders thirty product cards, and the staff who key this in all day feel every one
// of them. The memo only works because of the `onChange(sectionKey, …)` signature above:
// with a per-section arrow function the props would differ on every render and memo would
// compare, miss, and re-render anyway — costing time rather than saving it.
export default memo(SectionForm)
