import { Label } from '../ui/Primitives'
import { isFilled } from '../../utils/fill'
import { formatDate } from '../../utils/format'

// The read-only twin of SectionForm, for the page the partner reads over a public link.
//
// A second renderer rather than SectionForm with `disabled`, and the deciding reason is a
// leak rather than taste: Field -> FileField links every upload at
// api.documentUrl(partnerId, doc.id), and `disabled` only hides *Remove*. Reusing the
// dispatcher on an unauthenticated page would ship a staff byte-route builder — and the
// document ids to feed it — to whoever holds the link. It also keeps
// react-phone-number-input out of the public bundle, and 150 greyed-out inputs is not a
// document anyone can read: you cannot even select text out of a disabled input.

// Same set as SectionForm's, and duplicated for the same reason GroupRepeater duplicates
// it: react/only-export-components forbids a second export beside a component.
const FULL_WIDTH = new Set(['textarea', 'group', 'file', 'multiselect'])

function text(field, value) {
  // `false` first, because isFilled counts it as an answer — "no, we do not do private
  // label" must read as No, not as a blank.
  if (!isFilled(value)) return '—'
  switch (field.type) {
    case 'checkbox':
      return value ? 'Yes' : 'No'
    case 'multiselect':
      return (Array.isArray(value) ? value : [value]).join(', ')
    case 'date':
      return formatDate(value)
    default:
      // select included: per utils/options the stored value IS the label. An unknown type
      // still prints its answer rather than silently dropping it.
      return String(value)
  }
}

// Mirrors Field's own (fieldKey, itemIndex) match. `files` carry no document id — the
// payload behind this page deliberately has none — so there is nothing to link to.
function filesFor(files, fieldKey, itemIndex) {
  return files.filter((file) => file.fieldKey === fieldKey && (file.itemIndex ?? null) === itemIndex)
}

function Pair({ label, full, children }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <Label>{label}</Label>
      {/* pre-line: a textarea answer (a registered address) is line breaks and nothing
          else, and collapsing them turns it into one unreadable run. */}
      <div className="whitespace-pre-line break-words text-sm text-ink-900">{children}</div>
    </div>
  )
}

function FileNames({ files }) {
  if (!files.length) return '—'
  return (
    <ul className="space-y-0.5">
      {files.map((file, index) => (
        <li key={`${file.originalName}-${index}`}>{file.originalName}</li>
      ))}
    </ul>
  )
}

function GroupRows({ field, rows, files }) {
  const list = Array.isArray(rows) ? rows : []
  const subFields = field.fields || []
  // Same rule as GroupRepeater: the spec names the field a human recognises the row by.
  const titleField = subFields.find((sub) => sub.title) || subFields.find((sub) => (sub.type || 'text') === 'text')
  return (
    <div className="sm:col-span-2">
      <h3 className="mb-2 text-sm font-medium text-ink-800">{field.label}</h3>
      {!list.length ? (
        <p className="text-sm text-ink-500">—</p>
      ) : (
        <div className="space-y-3">
          {list.map((row, index) => (
            <div key={row?.id || index} className="rounded-2xl border border-ink-200 px-4 py-3">
              <p className="mb-3 text-sm font-medium text-ink-800">
                {(titleField && row?.[titleField.key]) || `${field.label.replace(/s$/, '')} ${index + 1}`}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {subFields.map((sub) => (
                  <Pair key={sub.key} label={sub.label} full={FULL_WIDTH.has(sub.type)}>
                    {sub.type === 'file' ? (
                      <FileNames files={filesFor(files, sub.key, index)} />
                    ) : (
                      text(sub, row?.[sub.key])
                    )}
                  </Pair>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReadOnlySection({ fields, value, documents }) {
  const data = value || {}
  const files = documents || []
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(fields || []).map((field) =>
        field.type === 'group' ? (
          <GroupRows key={field.key} field={field} rows={data[field.key]} files={files} />
        ) : (
          <Pair key={field.key} label={field.label} full={FULL_WIDTH.has(field.type)}>
            {field.type === 'file' ? (
              <FileNames files={filesFor(files, field.key, null)} />
            ) : (
              text(field, data[field.key])
            )}
          </Pair>
        ),
      )}
    </div>
  )
}
