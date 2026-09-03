// Contrast audit for both themes.   node scripts/check-contrast.mjs   (after `npm run build`)
//
// index.css themes the app by swapping the VALUES of its colour variables, which is what
// keeps dark mode out of the twenty component files — but it also means a single edited hex
// can quietly drop an error message or a badge below legibility in one theme while the other
// still looks fine. Nobody eyeballs twenty-five pairings twice. This does.
//
// It reads dist/, not src/: a variable that never made it into the bundle fails loudly here
// rather than being assumed. Tailwind's own palette is oklch and the dark overrides are hex,
// so both are converted to linear sRGB before comparing.
//
// Exits non-zero on a failure, so it can go in CI the day this repo has one.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist/assets'
const cssFile = readdirSync(DIST).filter((f) => f.endsWith('.css')).sort().pop()
if (!cssFile) {
  console.error('No built CSS in dist/assets — run `npm run build` first.')
  process.exit(1)
}
const css = readFileSync(join(DIST, cssFile), 'utf8')

// The `html.dark{ --… }` block only, isolated from the `html.dark .foo{…}` rules after it.
function darkVarBlock() {
  const open = css.search(/html\.dark\s*\{/)
  let i = css.indexOf('{', open) + 1
  for (let depth = 1; depth > 0; i++) depth += (css[i] === '{') - (css[i] === '}')
  return css.slice(css.indexOf('{', open) + 1, i - 1)
}

const collect = (text) =>
  Object.fromEntries(
    [...text.matchAll(/(--color-[a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,8}|oklch\([^)]*\))/gi)].map((m) => [m[1], m[2]]),
  )

const LIGHT = collect(css.slice(0, css.search(/html\.dark\s*\{/)))
const DARK = { ...LIGHT, ...collect(darkVarBlock()) }

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

function linearRgb(value) {
  if (value.startsWith('#')) {
    const h = value.slice(1)
    const pairs = h.length === 3 ? [...h].map((c) => c + c) : h.match(/../g)
    return pairs.slice(0, 3).map((x) => toLinear(parseInt(x, 16) / 255))
  }
  // oklch(L% C H) -> oklab -> linear sRGB
  const [rawL, C, H] = value.match(/-?[\d.]+%?/g).slice(0, 3)
  const L = parseFloat(rawL) / (rawL.includes('%') ? 100 : 1)
  const h = (parseFloat(H) * Math.PI) / 180
  const a = parseFloat(C) * Math.cos(h)
  const b = parseFloat(C) * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function luminance(value) {
  const [r, g, b] = linearRgb(value)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

// The two buttons take their background from a .btn-* class rather than from the numeric
// ramp — precisely because the step they used to share is text elsewhere — so they have to
// be read from the rule, not from a variable.
function utilityBackground(selector, theme) {
  const scoped = theme === DARK ? `html.dark ${selector}` : selector
  const match = css.match(new RegExp(`${scoped.replace('.', '\\.')}\\s*\\{[^}]*?background:\\s*([^;}]+)`))
  if (!match) throw new Error(`no background for ${scoped}`)
  const value = match[1].trim()
  const ref = value.match(/^var\((--color-[a-z0-9-]+)\)$/)
  return ref ? theme[ref[1]] : value
}

function resolve(theme, name) {
  if (name === 'white') return '#ffffff'
  if (name.startsWith('.')) return utilityBackground(name, theme)
  const value = theme[`--color-${name}`]
  if (!value) throw new Error(`--color-${name} is not in the built CSS`)
  return value
}

// [foreground, background, minimum, description]. 4.5 is WCAG AA for text, 3.0 for a
// graphic or an icon that only has to be locatable.
const PAIRS = [
  ['ink-900', 'surface', 4.5, 'heading on panel'],
  ['ink-800', 'surface', 4.5, 'strong text'],
  ['ink-700', 'surface', 4.5, 'field label'],
  ['ink-600', 'surface', 4.5, 'body text'],
  ['ink-500', 'surface', 4.5, 'secondary text'],
  ['ink-400', 'surface', 3.0, 'muted icon / hint'],
  ['ink-900', 'ink-50', 4.5, 'heading on page bg'],
  ['white', '.btn-gradient-primary', 4.5, 'primary button'],
  ['white', '.btn-danger', 4.5, 'danger button'],
  ['brand-700', 'surface', 4.5, 'link'],
  ['brand-800', 'brand-100', 4.5, '"Active" badge'],
  ['brand-800', 'brand-50', 4.5, 'active nav item'],
  ['brand-600', 'surface', 3.0, 'spinner / section-complete dot'],
  ['ink-900', 'brand-100', 4.5, 'rail active row'],
  ['red-600', 'surface', 4.5, 'under-field error message'],
  ['red-700', 'red-100', 4.5, 'error chip'],
  ['red-800', 'red-100', 4.5, '"Rejected" badge'],
  ['red-700', 'red-50', 4.5, 'error alert'],
  ['green-700', 'green-50', 4.5, 'success alert'],
  ['green-800', 'green-100', 4.5, '"Approved" badge'],
  ['amber-800', 'amber-100', 4.5, '"Submitted" badge'],
  // The avatar initial: white in light, brand-50 in dark (see AppShell).
  ['white', 'brand-600', 4.5, 'avatar initial', LIGHT],
  ['brand-50', 'brand-600', 4.5, 'avatar initial', DARK],
]

const failures = []
for (const [label, theme] of [['LIGHT', LIGHT], ['DARK', DARK]]) {
  console.log(`\n== ${label} ==`)
  for (const [fg, bg, min, what, only] of PAIRS) {
    if (only && only !== theme) continue
    const r = ratio(resolve(theme, fg), resolve(theme, bg))
    const ok = r >= min
    if (!ok) failures.push(`${label}: ${fg} on ${bg} = ${r.toFixed(2)} (need ${min}) — ${what}`)
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(6)} (min ${min})  ${fg} on ${bg} — ${what}`)
  }

  // Elevation. `hover:bg-ink-100` sits on a panel, and in dark mode the two are only a few
  // percent apart by design — close enough to look right, and close enough that a careless
  // edit makes the hover vanish entirely. Assert it stays visible.
  const [page, panel, hover] = ['ink-50', 'surface', 'ink-100'].map((n) => luminance(resolve(theme, n)))
  const gap = Math.abs(hover - panel)
  const ok = gap > 0.002
  if (!ok) failures.push(`${label}: hover:bg-ink-100 is invisible against a panel`)
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}         panel is ${panel > page ? 'lighter' : 'darker'} than the page`)
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}         hover vs panel Δluminance ${gap.toFixed(4)}`)
}

console.log()
if (failures.length) {
  console.log(`${failures.length} problem(s):`)
  for (const f of failures) console.log('  -', f)
  process.exit(1)
}
console.log('All pairs pass in both themes.')
