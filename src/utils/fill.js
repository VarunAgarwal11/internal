// "How much of this section has been answered?" — one definition, used by the rail's
// completion dots, every section header's `filled/total` and the overall progress bar.

// `false` counts as FILLED. A cleared checkbox ("no, we do not do private label") is an
// answer the staffer gave, not a blank: treating it as empty would park a section on
// 12/13 forever with nothing left to click, and the counter would be lying about work
// that is done. Only null/undefined/''/[]/{} are "not asked yet" — deliberately the same
// set the backend's _coerce() maps back to None, so the two agree on what a blank is.
export function isFilled(value) {
  if (value == null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.values(value).some(isFilled)
  return true
}

// Counted FROM THE SPEC, never from the stored keys: a section the staffer has not
// touched has no keys at all, and counting keys would report it 0/0 — i.e. complete.
//
// `documents` is this section's document rows. A `file` field has no value in the
// section JSON at all (see FileField), so the only evidence it was answered is a row
// whose (fieldKey, itemIndex) matches.
export function sectionFill(section, value, documents) {
  const data = value || {}
  const docs = documents || []
  const hasDoc = (fieldKey, itemIndex) =>
    docs.some((doc) => doc.fieldKey === fieldKey && (doc.itemIndex ?? null) === itemIndex)

  let filled = 0
  let total = 0

  for (const field of section.fields || []) {
    if (field.type === 'group') {
      const rows = Array.isArray(data[field.key]) ? data[field.key] : []
      if (!rows.length) {
        // An empty group asks no questions, so it would otherwise contribute 0/0 and the
        // products section — which is nothing but a group — would read as complete with
        // no products on it. A required empty group counts as exactly one open question.
        if (field.required) total += 1
        continue
      }
      for (const [index, row] of rows.entries()) {
        for (const sub of field.fields || []) {
          total += 1
          if (sub.type === 'file' ? hasDoc(sub.key, index) : isFilled(row?.[sub.key])) filled += 1
        }
      }
      continue
    }

    total += 1
    if (field.type === 'file' ? hasDoc(field.key, null) : isFilled(data[field.key])) filled += 1
  }

  return { filled, total }
}
