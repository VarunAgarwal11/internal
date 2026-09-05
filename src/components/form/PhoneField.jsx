import PhoneInput from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import { AsYouType, getExampleNumber, parsePhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js/min'
import examples from 'libphonenumber-js/examples.mobile.json'
import 'react-phone-number-input/style.css'
import { COUNTRIES } from '../../config/countries'

// Ported from KIORA's website/demoportfolio src/components/PhoneField.tsx — same library,
// same E.164 value shape — with its two-country restriction widened to Mavio's markets and
// the raw-hex CSS replaced by this app's own field styling.
//
// Every `type: "tel"` field in the spec renders through here, which today is `phone` and
// `whatsapp_number` on all three kinds plus `phone` on the references group. India is the
// default because that is the sourcing side and most partners sit there.
//
// The stored value is E.164 ("+919876543210"): one unambiguous string, dialable as-is by the
// WhatsApp/voice integrations, with the country IN the number rather than in a second column
// nobody remembers to read. The backend keeps treating it as free text (a `tel` is a trimmed
// string with an optional pattern — see sections._coerce), so there is no migration and no
// server change: existing rows stay valid, they just render normalised.
//
// The `min` metadata, where the source uses `/max`. Deliberate, and measured rather than
// assumed: `/max` costs ~75 kB more gzipped and buys validity rules this file never calls.
// The one thing the metadata IS used for — the mobile length per country — was compared
// across all 245 countries in examples.mobile.json and is identical in both sets, with no
// gaps. Switch back the day something here needs strict validity.

// A mobile number's length for its country, so a mistyped extra digit is stopped as it is
// typed rather than by the server after a save.
function maxNationalLength(country) {
  const example = getExampleNumber(country, examples)
  return example ? example.nationalNumber.length : null
}

// Anything typed before this component existed is a bare national number ("9876543210").
// PhoneInput only displays E.164, so without this the box would render EMPTY over a value
// that is still in the database — a staffer would read that as "not filled in" and retype
// it. Parsed as Indian, which is what whoever typed it meant.
function toE164(value) {
  if (!value || value.startsWith('+')) return value
  return parsePhoneNumberFromString(value, 'IN')?.number ?? value
}

// The digits typed AFTER the dialling code: "" for "+352", "621123456" for "+352621123456".
// Which is the difference between a country picked and a number given — see below, where it
// is the whole of what makes "not answered" distinguishable from "half typed".
function nationalDigits(value) {
  const formatter = new AsYouType()
  formatter.input(value || '')
  return formatter.getNationalNumber()
}

export default function PhoneField({ value, onChange, disabled, id, describedBy, invalid, required }) {
  // A dialling code with nothing typed after it is NOT an answer, and neither is a stored
  // value this component cannot render at all. Both rest on defaultCountry instead.
  //
  // Without this, "+352" (see onChange) came back as a number libphonenumber cannot resolve,
  // so `outOfList` below went true, the International entry was added and selected, and the
  // field settled on a flagless "—" beside a bare Luxembourg dialling code — on a form where
  // every other empty phone box reads +91. Half-typed values are untouched: one national
  // digit is enough to keep them, which is what lets this run on a controlled input.
  const stored = toE164(value)
  const e164 = stored?.startsWith('+') && nationalDigits(stored) ? stored : null
  // A number already in the database may belong to a country that is not on the list — saved
  // before the list existed, or under a market since dropped. With no "International" entry
  // the library has nothing valid to select, so it falls back to an arbitrary country and
  // draws that flag over a number it does not belong to (see getPreSelectedCountry). Keeping
  // the entry open for exactly those values shows the truth; every other value stays boxed
  // into the list.
  const outOfList = !!e164 && !COUNTRIES.includes(parsePhoneNumberFromString(e164)?.country)

  return (
    <PhoneInput
      id={id}
      international
      countries={COUNTRIES}
      addInternationalOption={outOfList}
      // The dial code belongs to the country picker, not the text box: editable, it can be
      // made to disagree with the flag sitting next to it.
      countryCallingCodeEditable={false}
      flags={flags}
      defaultCountry="IN"
      value={e164 ?? undefined}
      // undefined when cleared; the section JSON stores null for "not answered", which is
      // what _coerce turns "" into anyway.
      //
      // Touching the country picker on an empty field makes the library report "+352" — a
      // dialling code and no number. Stored, autosave puts that lone code in the record 800 ms
      // later, and the server takes it: a `tel` is free text there (see sections._coerce), so
      // nothing downstream rejects it and "WhatsApp number: +352" reaches the PDF the partner
      // is asked to confirm. Nothing typed is nothing answered, whatever flag is showing.
      onChange={(next) => onChange(nationalDigits(next) ? next : null)}
      disabled={disabled}
      className="flex items-center gap-2"
      countrySelectComponent={CountrySelect}
      numberInputProps={{
        className:
          'glass-input w-full rounded-2xl px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus-visible:outline-none',
        // No aria-label: `id` lands on this input (the library spreads unrecognised props
        // onto it), so Field's own <Label htmlFor> already names it — and an aria-label
        // here would override that visible label rather than add to it.
        'aria-invalid': invalid || undefined,
        'aria-required': required || undefined,
        'aria-describedby': describedBy,
        onKeyDown: (e) => {
          if (!/^\d$/.test(e.key)) return
          try {
            const parsed = parsePhoneNumber(e.currentTarget.value.replace(/\s/g, ''))
            if (!parsed?.country) return
            const max = maxNationalLength(parsed.country)
            if (max !== null && parsed.nationalNumber.length >= max) e.preventDefault()
          } catch {
            // Incomplete number — nothing to measure against yet, so let it through.
          }
        },
      }}
    />
  )
}

// A flag + code pill with the real <select> laid over it invisibly, so the OS draws its own
// native picker (and a phone gets the native wheel) while the trigger looks like the rest of
// the form. A native picker also gets type-ahead for free, which still earns its keep at 34
// options once the EU expands.
function CountrySelect({ value, onChange, options, disabled }) {
  const Flag = value ? flags[value] : null
  return (
    <div className="glass-input relative flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl px-3 py-2.5">
      {Flag ? (
        <Flag title={value} className="h-4 w-6 shrink-0" />
      ) : (
        // The "International" entry has no country, so no flag — a fixed-width spacer keeps
        // the pill from resizing as the selection changes.
        <span className="h-4 w-6 shrink-0" aria-hidden="true" />
      )}
      <span className="text-sm font-medium text-ink-700">{value || '—'}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={disabled}
        aria-label="Country"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.value || 'intl'} value={option.value || ''}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
