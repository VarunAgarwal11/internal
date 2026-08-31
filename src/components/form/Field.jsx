import FileField from './FileField'
import GroupRepeater from './GroupRepeater'
import { Input, Label, Select, Textarea } from '../ui/Primitives'
import { fieldDomId } from '../../utils/fieldId'

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

      case 'select':
        return (
          <Select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {/* ALWAYS first, and never removable. Without it the browser "chooses" option 1
                for a field nobody has touched, and the server cannot tell a default apart
                from an answer. Across 150 fields that is the difference between "not asked
                yet" and a fabricated answer sitting in a supplier's approved record. */}
            <option value="">Select…</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        )

      case 'multiselect': {
        // A checkbox grid, not <select multiple>: a ctrl-click list is unusable for data
        // entry (one stray click wipes every earlier selection) and this form would be
        // full of them.
        const selected = Array.isArray(value) ? value : []
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            {(field.options || []).map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
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
            ))}
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

      case 'email':
      case 'tel':
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
