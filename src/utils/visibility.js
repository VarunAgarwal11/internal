// The browser half of the backend's `is_visible` / `visible_spec` (app/sections.py).
// A gate is `visibleIf: { field: "company.services_offered", includes: "CHA" }`, and the
// two implementations have to agree exactly: the server drops hidden fields before
// validating, so a field this file leaves on screen but the server hides would be a
// required-looking input that never blocks submit — and the reverse is a partner blocked
// by a question they were never shown.
//
// It lives in utils/ rather than beside a component for the reason fieldId.js explains:
// react/only-export-components makes a non-component export next to a component a
// warning, and PartnerFormPage needs these without dragging a component along.

// `stored` is the same shape the form holds in state: { sectionId: { key: value } }.
export function isVisible(node, values) {
  const rule = node.visibleIf
  if (!rule) return true
  // partition on the FIRST "." — a field key may contain one, a section id may not.
  // Written this way rather than with indexOf so a gate with no dot at all behaves
  // exactly as Python's str.partition does (whole string, empty key -> hidden), instead
  // of silently slicing the last character off the section id.
  const [sectionId, ...rest] = rule.field.split('.')
  const value = (values?.[sectionId] || {})[rest.join('.')]
  // Python's `x in list` vs `x == scalar`. A missing value is undefined, which is neither
  // a list nor equal to any `includes` string, so an unanswered gate hides — same as the
  // server, where `.get()` returns None.
  return Array.isArray(value) ? value.includes(rule.includes) : value === rule.includes
}

// Only sections and their top-level fields are filtered. A gate inside a group is
// rejected by an import-time assert on the server, so the case cannot reach us and
// recursion here would be dead code.
export function visibleSpec(sections, values) {
  return (sections || [])
    .filter((section) => isVisible(section, values))
    .map((section) => ({ ...section, fields: (section.fields || []).filter((f) => isVisible(f, values)) }))
}
