// The browser half of the backend's `options_by` (app/sections.py) — the same pairing as
// visibility.js and the backend's `visible_if`, and for the same reason: the server drops
// a value this file would have offered, so the two have to agree exactly.
//
// A gate is `optionsBy: { field: "category", map: { Spices: [...], Agro: [...] } }`. The
// field name is a bare sibling key, not a dotted section path, because the answer that
// narrows a product select is the category on that same group ROW — the row above may
// hold a different one.

// The options a select actually offers right now. Ungated fields keep `field.options`
// untouched, so every other select on the form renders exactly as it did.
export function fieldOptions(field, siblings) {
  const rule = field.optionsBy
  if (!rule) return field.options || []
  // No parent answer yet -> no options. The caller disables the control rather than
  // showing an empty menu that looks broken.
  return rule.map[siblings?.[rule.field]] || []
}

// Re-answering the parent invalidates the child: switch a card from Spices to Chemicals
// and the "Turmeric" already stored on it is no longer on the menu. React renders a
// <select> whose value is not among its options as blank, so without this the row would
// LOOK empty while still holding Turmeric — and the next autosave posts a pair the server
// rejects, with the cause two fields away from the error.
//
// ponytail: scalar selects only, which is all `options_by` allows on the server.
export function clearStaleDependents(fields, values) {
  const stale = (fields || []).filter(
    (f) => f.optionsBy && values[f.key] != null && !fieldOptions(f, values).includes(values[f.key]),
  )
  if (!stale.length) return values
  return { ...values, ...Object.fromEntries(stale.map((f) => [f.key, null])) }
}
