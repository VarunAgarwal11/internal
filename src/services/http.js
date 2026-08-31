// Thin fetch wrapper. Every request is same-origin and carries the httpOnly
// session cookie; no token is ever read or stored by JS.
// Exported: an <a href> to a document cannot go through fetch, so it needs the same base.
// Same-origin is load-bearing there too — the httpOnly session cookie rides along
// automatically, which is the whole reason /documents/{id}/file needs no token.
export const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  // `errors` is the per-field map from a 422 submit: { "<sectionId>.<fieldPath>": "msg" }.
  // It rides on the error rather than being fetched separately because the form needs it
  // at exactly the moment this is thrown — the alternative is every caller re-parsing a
  // payload the wrapper already consumed and threw away.
  constructor(message, status, code, errors) {
    super(message)
    this.status = status
    this.code = code
    this.errors = errors
  }
}

// Takes the already-parsed payload, not the Response: a body can only be read once.
function apiError(response, payload) {
  // FastAPI puts our structured errors under `detail`; it can be a string or
  // the {code, message} shape used by submit validation and role conflicts.
  const detail = payload?.detail
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    return new ApiError(detail.message || 'Something went wrong.', response.status, detail.code, detail.errors)
  }
  const message =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail[0]?.msg || 'Please check the form and try again.'
        : 'Something went wrong.'
  return new ApiError(message, response.status)
}

// The session cookie can be replaced under a tab that is already loaded: cookies are
// per-host, not per-port, so logging into another account on a second dev server (or
// another tab) swaps it. A 401/403 is the first sign this tab's idea of who is logged
// in is stale — AuthProvider registers a re-read here so the chrome stops offering
// admin-only actions the server will refuse.
let onAuthError = null

export function setAuthErrorHandler(handler) {
  onAuthError = handler
}

async function request(method, path, body) {
  // FormData sets its own multipart Content-Type (with the boundary) — setting
  // ours would corrupt the request.
  const isForm = body instanceof FormData
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined || isForm ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined || isForm ? body : JSON.stringify(body),
  })

  if (response.status === 204) return null

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    // /auth/* is excluded so a failing identity check cannot re-trigger itself.
    if ((response.status === 401 || response.status === 403) && !path.startsWith('/auth/')) onAuthError?.()
    throw apiError(response, payload)
  }

  return payload
}

export const get = (path) => request('GET', path)
export const post = (path, body) => request('POST', path, body)
export const patch = (path, body) => request('PATCH', path, body)
export const put = (path, body) => request('PUT', path, body)
export const del = (path) => request('DELETE', path)
export const upload = (path, formData) => request('POST', path, formData)
