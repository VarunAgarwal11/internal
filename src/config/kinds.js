// The one place a kind's user-facing strings live. Route path, singular and plural
// labels, the identifier column, the nav icon and the create-modal example name are all
// per-kind facts with no rule behind them: 'logistics_cha' pluralizes to neither
// "Logistics_chas" nor "Logistics / CHA partners", and its identifier is `taxRef` even
// though its label says GSTIN. A table states them once instead of spreading a
// `kind === 'buyer' ? … : …` down every screen that renders one.
//
// The keys are the backend's kind slugs verbatim — they are what `?kind=` and every
// f"{kind}:{action}" permission are built from, so they cannot be prettified here.
export const KINDS = {
  supplier: {
    path: '/suppliers',
    label: 'Supplier',
    plural: 'Suppliers',
    idLabel: 'GSTIN',
    idField: 'gstin',
    icon: 'box',
    placeholder: 'e.g. Sunrise Exports Private Limited',
  },
  buyer: {
    path: '/buyers',
    label: 'Buyer',
    plural: 'Buyers',
    idLabel: 'Tax ID',
    idField: 'taxRef',
    icon: 'cart',
    placeholder: 'e.g. Nordwind Handels GmbH',
  },
  logistics_cha: {
    path: '/logistics-cha',
    label: 'Logistics / CHA partner',
    plural: 'Logistics & CHA',
    idLabel: 'GSTIN / VAT',
    idField: 'taxRef',
    icon: 'truck',
    placeholder: 'e.g. Seabridge Freight Services Pvt Ltd',
  },
}
