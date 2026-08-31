// The DOM id for one field, derived from its dotted address (`items[2].hsn_code`).
//
// It lives in its own module rather than next to the component that uses it because
// .oxlintrc.json enables react/only-export-components: a second export sitting beside a
// component is a warning there (and a fast-refresh hazard). SupplierFormPage needs the
// exact same function to scroll to the first field the server rejected, so it has to be
// importable without dragging Field.jsx along.
export const fieldDomId = (path) => `f-${String(path).replace(/[^\w-]/g, '_')}`
