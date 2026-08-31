// Single service-layer entry point for ALL data access in the app. Every screen calls a
// function exported here; nothing outside this file knows a URL.
import * as http from './http'

// ---------------------------------------------------------------------------
// Auth. The session is an httpOnly cookie set by the server; nothing here reads
// or stores a token, and no request carries an Authorization header.
// ---------------------------------------------------------------------------

export const login = ({ email, password }) => http.post('/auth/login', { email, password })
export const logout = () => http.post('/auth/logout')
export const getMe = () => http.get('/auth/me')
export const changePassword = ({ currentPassword, newPassword }) =>
  http.post('/auth/change-password', { currentPassword, newPassword })

// ---------------------------------------------------------------------------
// Onboarding spec — the schema the form renderer is driven by. Server-owned:
// adding a field is a backend change and no frontend release.
// ---------------------------------------------------------------------------

export const getFormSpec = (kind = 'supplier') => http.get(`/onboarding/spec?kind=${kind}`)

// ---------------------------------------------------------------------------
// Partners (suppliers and buyers are the same table; `kind` is a column)
// ---------------------------------------------------------------------------

export function getPartners({ kind = 'supplier', status, q } = {}) {
  const params = new URLSearchParams({ kind })
  if (status && status !== 'all') params.set('status', status)
  if (q) params.set('q', q)
  return http.get(`/partners?${params}`)
}

export const getPartner = (id) => http.get(`/partners/${id}`)

export const createPartner = ({ kind = 'supplier', legalName }) => http.post('/partners', { kind, legalName })

// Both PATCHes replace the named sections whole — the editors hand over complete section
// objects, so a field-level merge would be a second, weaker definition of a section.
export const saveSections = (id, sections) => http.patch(`/partners/${id}/sections`, { sections })

export const saveVerification = (id, verification) => http.patch(`/partners/${id}/verification`, { verification })

// 422 on an incomplete form; the per-field map arrives as ApiError.errors, keyed
// "<sectionId>.<fieldPath>".
export const submitPartner = (id) => http.post(`/partners/${id}/submit`)

export const approvePartner = (id) => http.post(`/partners/${id}/approve`)
export const rejectPartner = (id, reason) => http.post(`/partners/${id}/reject`, { reason })
export const deletePartner = (id) => http.del(`/partners/${id}`)

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

// FormData is built here rather than in the component so the field names stay next to
// the endpoint that reads them.
export function uploadDocument(partnerId, { file, sectionId, fieldKey, itemIndex }) {
  const form = new FormData()
  form.append('file', file)
  form.append('sectionId', sectionId)
  form.append('fieldKey', fieldKey)
  if (itemIndex !== undefined && itemIndex !== null) form.append('itemIndex', String(itemIndex))
  return http.upload(`/partners/${partnerId}/documents`, form)
}

export const deleteDocument = (partnerId, docId) => http.del(`/partners/${partnerId}/documents/${docId}`)

// Used as an <a href>, not fetched: a same-origin navigation carries the httpOnly cookie
// on its own, so the browser downloads the file with no token, no blob URL and no
// intermediate copy of the bytes in JS memory.
export const documentUrl = (partnerId, docId) => `${http.BASE_URL}/partners/${partnerId}/documents/${docId}/file`

// ---------------------------------------------------------------------------
// Permissions & roles — the catalog is server-owned. See AuthContext's `can`.
// ---------------------------------------------------------------------------

export const getPermissions = () => http.get('/permissions')

export const getRoles = () => http.get('/roles')
export const createRole = ({ name, description, permissions }) =>
  http.post('/roles', { name, description, permissions })
export const updateRole = (id, patch) => http.patch(`/roles/${id}`, patch)
// 409 with code 'role_in_use' when users still hold it — the caller shows that inline.
export const deleteRole = (id) => http.del(`/roles/${id}`)

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function getUsers({ search, status, roleId } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status && status !== 'all') params.set('status', status)
  if (roleId && roleId !== 'all') params.set('roleId', roleId)
  const query = params.toString()
  return http.get(`/users${query ? `?${query}` : ''}`)
}

export const createUser = ({ email, fullName, password, role, roleId }) =>
  http.post('/users', { email, fullName, password, role, roleId: roleId || null })

export const updateUser = (id, patch) => http.patch(`/users/${id}`, patch)

// Soft delete server-side: the row stays with status 'deleted' so the audit trail on
// everything they touched still resolves to a name.
export const deleteUser = (id) => http.del(`/users/${id}`)
