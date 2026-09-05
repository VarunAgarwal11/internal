// The markets Mavio trades in: India on the sourcing side, the rest on the selling side.
// Restricts the phone picker in components/form/PhoneField.jsx — every `type: "tel"` field
// in the spec renders through it.
//
// "EU" is a bloc, not a dialling country, so it expands to all 27 member states. A superset
// is the safe reading: a shortlist that guesses wrong locks out a real partner, while the
// extra entries only sit unused in a dropdown.
//
// ISO 3166-1 alpha-2, which is what react-phone-number-input and libphonenumber both speak.
// An unsupported code is dropped silently rather than throwing, so `npm run check:countries`
// exists to catch a typo before a market goes quietly missing from the list.
const EU = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]

export const COUNTRIES = ['IN', 'US', 'AE', 'SG', 'MY', 'VN', 'TH', ...EU]
