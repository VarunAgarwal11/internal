import FileField from './FileField'
import GroupRepeater from './GroupRepeater'
import PhoneField from './PhoneField'
import { Input, Label, Select, Textarea } from '../ui/Primitives'
import { fieldDomId } from '../../utils/fieldId'
import { fieldOptions } from '../../utils/options'

// THE DISPATCHER — the only file in this app that knows what an input element is.
// Everything above it deals in spec objects; everything below it is one control.
//
// `path` is the dotted address WITHIN the section (`hsn_code`, `items[2].hsn_code`). It
// is three things at once: the key server errors arrive under, the aria wiring, and —
// with `scope` — the DOM id.
//
// `scope` is an opaque prefix the parent supplies for id uniqueness. It exists because
// the supplier spec really does repeat keys across sections (`iec` in legal AND export,
// `moq` in products AND pricing, `nearest_port` in export AND logistics); without it
// three pairs of inputs would share a DOM id, `<label for>` would focus the wrong one and
// getElementById would scroll to the wrong section. Field never learns it is a section id.
//
// `errors` is passed down WHOLE, never pre-indexed, because GroupRepeater re-keys into it
// per row (`items[2].hsn_code`) and cannot do that with a map already narrowed to a field.
export default function Field({
  field,
  path = field.key,
  scope = '',
  value,
  onChange,
  errors,
  documents,
  itemIndex = null,
  partnerId,
  onUpload,
  onRemoveFile,
  disabled,
  // multiselect only: { [option]: { field, value, onChange } } for a gated field that
  // belongs beside that option rather than as its own row — see SectionForm.
  inline,
  // The other answers at this field's own level — the section's for a top-level field, the
  // row's for one inside a group. Only `optionsBy` reads it; everything else is unchanged.
  siblings,
}) {
  // A repeating group owns its whole block — heading, cards, add button — because a list
  // of 19-field cards is not "a control with a label above it".
  if (field.type === 'group') {
    return (
      <GroupRepeater
        field={field}
        path={path}
        scope={scope}
        value={value}
        onChange={onChange}
        errors={errors}
        documents={documents}
        partnerId={partnerId}
        onUpload={onUpload}
        onRemoveFile={onRemoveFile}
        disabled={disabled}
      />
    )
  }

  const domId = fieldDomId(scope ? `${scope}.${path}` : path)
  const error = errors?.[path]
  const helpId = field.help ? `${domId}-help` : null
  const errorId = error ? `${domId}-error` : null
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined

  const common = {
    id: domId,
    disabled,
    'aria-invalid': error ? true : undefined,
    // Announced, but not enforced: the server is the only validator. `required` on the
    // element itself would let the browser block a draft save of a half-filled form.
    'aria-required': field.required || undefined,
    'aria-describedby': describedBy,
  }

  const star = field.required ? (
    <span className="ml-0.5 text-red-600" aria-hidden="true">
      *
    </span>
  ) : null

  const help = field.help ? (
    <p id={helpId} className="mt-1 text-xs text-ink-500">
      {field.help}
    </p>
  ) : null

  const errorText = error ? (
    <p id={errorId} className="mt-1 text-sm text-red-600">
      {error}
    </p>
  ) : null

  // Labels itself beside the box, so it skips the shared <Label> above entirely.
  if (field.type === 'checkbox') {
    return (
      <div>
        <label htmlFor={domId} className="flex cursor-pointer items-start gap-2 text-sm text-ink-700">
          <input
            {...common}
            type="checkbox"
            // An unanswered checkbox is null in the stored JSON; `checked` has to stay a
            // real boolean or React flips the input to uncontrolled halfway through a session.
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-ink-300 accent-brand-600"
          />
          <span>
            {field.label}
            {star}
          </span>
        </label>
        {help}
        {errorText}
      </div>
    )
  }

  function renderControl() {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea {...common} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        )

      case 'number':
        return (
          <Input
            {...common}
            type="number"
            value={value ?? ''}
            // '' -> null, NEVER Number(''). That is 0, and it would post a real zero for
            // every blank numeric field on the form: "0 employees", "₹0 minimum order",
            // "0 factories" — answers nobody gave, indistinguishable from ones they did.
            onChange={(e) => (e.target.value === '' ? onChange(null) : onChange(Number(e.target.value)))}
          />
        )

      case 'date':
        // Native picker. No date library: the value is already the ISO string the API wants.
        return <Input {...common} type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />

      case 'select': {
        // Narrowed by a sibling's answer when the spec says so — "Category: Spices" leaves
        // only the spices on the product menu. See utils/options.
        const options = fieldOptions(field, siblings)
        const awaitingParent = Boolean(field.optionsBy) && options.length === 0
        return (
          <Select
            {...common}
            // Disabled rather than showing a menu with nothing in it: an empty dropdown
            // reads as a broken form, whereas a greyed-out one reads as "not yet".
            disabled={disabled || awaitingParent}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            {/* ALWAYS first, and never removable. Without it the browser "chooses" option 1
                for a field nobody has touched, and the server cannot tell a default apart
                from an answer. Across 150 fields that is the difference between "not asked
                yet" and a fabricated answer sitting in a supplier's approved record. */}
            {/* Names the field to answer first, from the spec's own key — no field name is
                written into this file, same rule as everywhere else here. */}
            <option value="">
              {awaitingParent ? `Select a ${field.optionsBy.field.replace(/_/g, ' ')} first…` : 'Select…'}
            </option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        )
      }

      case 'multiselect': {
        // A checkbox grid, not <select multiple>: a ctrl-click list is unusable for data
        // entry (one stray click wipes every earlier selection) and this form would be
        // full of them.
        const selected = Array.isArray(value) ? value : []
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            {(field.options || []).map((option) => {
              // Present only once the gate is satisfied — visibleSpec already dropped it
              // from `fields` otherwise, so there is no "checked but blank hidden" state.
              const companion = inline?.[option]
              return (
                <div key={option} className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={selected.includes(option)}
                      onChange={(e) =>
                        onChange(e.target.checked ? [...selected, option] : selected.filter((o) => o !== option))
                      }
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-ink-300 accent-brand-600"
                    />
                    {option}
                  </label>
                  {companion && (
                    <input
                      type={companion.field.type === 'number' ? 'number' : 'text'}
                      // A blank quantity beside a checked option is "how much", never
                      // zero or negative — min blocks the spinner arrows from going there;
                      // the server is still the real validator, same as every other field.
                      min={companion.field.type === 'number' ? 1 : undefined}
                      disabled={disabled}
                      value={companion.value ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        companion.onChange(
                          companion.field.type === 'number' ? (raw === '' ? null : Number(raw)) : raw,
                        )
                      }}
                      aria-label={companion.field.label}
                      className="w-20 rounded-md border border-ink-300 px-2 py-1 text-sm"
                    />
                  )}
                </div>
              )
            })}
          </div>
        )
      }

      case 'file':
        // Files are NOT in the section JSON — see FileField.
        return (
          <FileField
            field={field}
            documents={(documents || []).filter(
              (doc) => doc.fieldKey === field.key && (doc.itemIndex ?? null) === itemIndex,
            )}
            partnerId={partnerId}
            onUpload={(file) => onUpload(field.key, itemIndex, file)}
            onRemoveFile={onRemoveFile}
            disabled={disabled}
          />
        )

      case 'tel':
        // Country picker + E.164, rather than a free-text box that accepts "98765 43210",
        // "+91-9876543210" and "0091 98765 43210" as three different strings for one
        // number. See PhoneField.
        return (
          <PhoneField
            id={domId}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={field.required}
            invalid={Boolean(error)}
            describedBy={describedBy}
          />
        )

      case 'email':
      case 'url':
        // The matching native type, for the browser's own check and — the reason that
        // actually matters on a phone — the right on-screen keyboard.
        return (
          <Input
            {...common}
            type={field.type}
            value={value ?? ''}
            pattern={field.pattern || undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      default:
        // An unknown type renders a TEXT INPUT, never nothing. Rendering nothing would
        // hide a stored answer, and the next autosave would spread a section object with
        // that key missing — indistinguishable from the staffer having deleted it. A spec
        // that outruns this file must degrade to "editable text", not to data loss.
        return (
          <Input
            {...common}
            type="text"
            value={value ?? ''}
            // A regex STRING from the spec, handed straight to the browser so it checks
            // the same definition the server does. No JS validation lives here — the
            // server is the only validator.
            pattern={field.pattern || undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        )
    }
  }

  // multiselect and file render a set of elements, not one labelable control, so the id
  // and the aria wiring go on a wrapper and the <Label> drops its htmlFor rather than
  // pointing at something a click cannot focus.
  const labelable = field.type !== 'multiselect' && field.type !== 'file'
  const control = renderControl()

  return (
    <div>
      <Label htmlFor={labelable ? domId : undefined}>
        {field.label}
        {star}
      </Label>
      {labelable ? (
        control
      ) : (
        <div id={domId} role="group" aria-label={field.label} aria-describedby={describedBy}>
          {control}
        </div>
      )}
      {help}
      {errorText}
    </div>
  )
}
