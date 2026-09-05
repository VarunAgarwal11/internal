// Sanity-check the phone picker's country list.   node scripts/check-countries.mjs
//
// src/config/countries.js is data, and the way data breaks is a typo: 'UK' instead of 'GB',
// a duplicate after an EU edit, a code libphonenumber has never heard of. None of those
// throw — react-phone-number-input silently drops an unsupported code, so the market just
// goes missing from the dropdown and nobody notices until a partner cannot be keyed in.
//
// Exits non-zero on a failure, so it can go in CI the day this repo has one.
import { getCountries } from 'libphonenumber-js/min'
import { COUNTRIES } from '../src/config/countries.js'

const known = new Set(getCountries())
const failures = []

const unknown = COUNTRIES.filter((c) => !known.has(c))
if (unknown.length) failures.push(`not dialling countries in libphonenumber: ${unknown.join(', ')}`)

const dupes = COUNTRIES.filter((c, i) => COUNTRIES.indexOf(c) !== i)
if (dupes.length) failures.push(`listed twice: ${[...new Set(dupes)].join(', ')}`)

// India plus the seven selling markets, with EU as its 27 member states.
if (COUNTRIES.length !== 34) failures.push(`expected 34 entries, got ${COUNTRIES.length}`)

// The default country must be selectable, or the field opens on a country the picker denies.
if (!COUNTRIES.includes('IN')) failures.push('IN is the defaultCountry but is not in the list')

console.log(`${COUNTRIES.length} countries: ${COUNTRIES.join(' ')}`)
if (failures.length) {
  console.log(`\n${failures.length} problem(s):`)
  for (const f of failures) console.log('  -', f)
  process.exit(1)
}
console.log('All entries are dialling countries, no duplicates.')
