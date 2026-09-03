import { memo } from 'react'
import Field from './Field'
import { Alert } from '../ui/Primitives'

// Textareas, groups, upload zones and checkbox grids get the full width: a 3-row textarea
// or a stack of product cards squeezed into half a row is unreadable.
const FULL_WIDTH = new Set(['textarea', 'group', 'file', 'multiselect'])

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

  const inlineByHost = {}
  const inlined = new Set()
  for (const field of fields) {
    const rule = field.visibleIf
    if (!rule) continue
    const [ruleSectionId, ruleKey] = rule.field.split('.')
    if (ruleSectionId !== sectionId) continue
    const host = fields.find((f) => f.key === ruleKey && f.type === 'multiselect')
    if (!host) continue
    inlineByHost[host.key] ??= {}
    inlineByHost[host.key][rule.includes] = {
      field,
      value: data[field.key],
      onChange: (next) => onChange(sectionId, { ...data, [field.key]: next }),
    }
    inlined.add(field.key)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* A section-level message ("Unknown section.", "Expected an object.") arrives keyed
          to the section with an empty field path. Without this it would be swallowed. */}
      {errors?.[''] && <Alert className="sm:col-span-2">{errors['']}</Alert>}

      {fields.filter((field) => !inlined.has(field.key)).map((field) => (
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
            inline={inlineByHost[field.key]}
          />
        </div>
      ))}
    </div>
  )
}
export default memo(SectionForm)
