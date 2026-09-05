// The `optionsBy` narrowing, browser half.   node scripts/check-options.mjs
//
// utils/options.js and the server's `options_by` (app/sections.py) are two copies of one
// rule, and the failure mode is silent: a menu that offers a product the server rejects,
// or a stale value the SPA keeps showing after its category changed. The Python side is
// covered by tests/test_sections.py; this covers the half that runs in the browser.
//
// Exits non-zero on a failure, so it can go in CI the day this repo has one.
import assert from 'node:assert/strict'
import { fieldOptions, clearStaleDependents } from '../src/utils/options.js'

const category = { key: 'category', type: 'select', options: ['Spices', 'Chemicals'] }
const product = {
  key: 'product_name',
  type: 'select',
  options: ['Turmeric', 'IPA'],
  optionsBy: { field: 'category', map: { Spices: ['Turmeric'], Chemicals: ['IPA'] } },
}
const fields = [category, product]

// Narrowing.
assert.deepEqual(fieldOptions(product, { category: 'Spices' }), ['Turmeric'])
assert.deepEqual(fieldOptions(product, { category: 'Chemicals' }), ['IPA'])
// Unanswered parent offers nothing, which is what disables the control.
assert.deepEqual(fieldOptions(product, {}), [])
// An unknown parent value is not a crash and not the full list.
assert.deepEqual(fieldOptions(product, { category: 'Textiles' }), [])
// An ungated field is untouched — every other select on the form goes down this path.
assert.deepEqual(fieldOptions(category, {}), ['Spices', 'Chemicals'])

// The stale sweep: the whole point is that switching category drops the product with it.
assert.equal(
  clearStaleDependents(fields, { category: 'Chemicals', product_name: 'Turmeric' }).product_name,
  null,
)
// A still-valid pair is returned by identity, so React does not re-render on every keystroke.
const valid = { category: 'Spices', product_name: 'Turmeric' }
assert.equal(clearStaleDependents(fields, valid), valid)
// Clearing the parent clears the child too, rather than stranding it behind a disabled box.
assert.equal(clearStaleDependents(fields, { product_name: 'Turmeric' }).product_name, null)
// An unanswered child is left alone — null must not become a "cleared" write of its own.
assert.deepEqual(clearStaleDependents(fields, { category: 'Spices' }), { category: 'Spices' })

console.log('optionsBy: narrowing and stale-value sweep behave as the server expects.')
