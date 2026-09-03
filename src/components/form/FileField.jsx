import { useRef, useState } from 'react'
import * as api from '../../services/api'
import { Spinner } from '../ui/Primitives'

const ACCEPT = '.pdf,.jpg,.jpeg,.png'
const MAX_MB = 20

function sizeLabel(bytes) {
  if (!bytes) return ''
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// The `file` field type.
//
// Files are NOT in the section JSON. An upload POSTs the moment it is dropped and the
// section object never mentions it; the field renders from the `documents` rows whose
// (sectionId, itemIndex, fieldKey) match it. That is the design decision that removes an
// entire class of bug: with a document id living in the section JSON, every upload would
// need a matching section save, and any dropped save would leave a stored file nothing
// points at — or a section pointing at a file that was never stored.
export default function FileField({ field, documents, partnerId, onUpload, onRemoveFile, disabled }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  const docs = documents || []
  const multiple = Boolean(field.multiple)

  // UX only, NOT security: extension and size are re-checked server-side, including magic
  // bytes, because everything here is client-controlled. This exists so a 40 MB TIFF fails
  // in the browser instead of after a minute of upload.
  function validate(file) {
    const ext = `.${file.name.split('.').pop().toLowerCase()}`
    if (!ACCEPT.split(',').includes(ext)) return `unsupported file type. Allowed: ${ACCEPT}`
    if (file.size > MAX_MB * 1024 * 1024) return `too large. Max ${MAX_MB} MB.`
    return null
  }

  // One file at a time, sequentially: the endpoint takes a single file per request, and a
  // failure on file 3 must not throw away files 1 and 2. Every rejection is named.
  async function handleFiles(fileList) {
    const files = Array.from(fileList).slice(0, multiple ? undefined : 1)
    const failures = []
    setError(null)
    setBusy(true)
    for (const file of files) {
      const problem = validate(file)
      if (problem) {
        failures.push(`${file.name}: ${problem}`)
        continue
      }
      try {
        await onUpload(file)
      } catch (err) {
        failures.push(`${file.name}: ${err.message || 'upload failed.'}`)
      }
    }
    setBusy(false)
    setError(failures.length ? failures.join(' · ') : null)
  }

  async function handleRemove(doc) {
    setError(null)
    setBusy(true)
    try {
      await onRemoveFile(doc)
    } catch (err) {
      setError(err.message || 'Could not remove that file.')
    }
    setBusy(false)
  }

  return (
    <div>
      {docs.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm"
            >
              {/* A plain <a>, never a fetch + blob URL: a same-origin navigation carries
                  the httpOnly session cookie, which a fetch would have to re-authorise and
                  a blob URL would strip the filename and the Content-Disposition from. */}
              <a
                href={api.documentUrl(partnerId, doc.id)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
              >
                {doc.originalName || 'Document'}
              </a>
              <span className="shrink-0 text-xs text-ink-400">{sizeLabel(doc.sizeBytes)}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(doc)}
                  disabled={busy}
                  className="shrink-0 cursor-pointer text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
            dragOver ? 'border-brand-500 bg-brand-50' : 'border-ink-300 bg-ink-50/40 hover:bg-ink-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple={multiple}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files)
              // Cleared so re-picking the same file after a failed upload still fires change.
              e.target.value = ''
            }}
          />
          {busy ? (
            <div className="flex items-center justify-center gap-2 text-sm text-ink-600">
              <Spinner className="h-4 w-4" />
              Uploading…
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-ink-700">
                {docs.length && !multiple ? 'Replace file' : 'Drag and drop, or click to select'}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                PDF, JPG, PNG · max {MAX_MB} MB{multiple ? ' · one or more files' : ''}
              </p>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  )
}
