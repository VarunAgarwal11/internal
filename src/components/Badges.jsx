const PARTNER_STATUS = {
  draft: { label: 'Draft', classes: 'bg-ink-100 text-ink-700' },
  submitted: { label: 'Submitted', classes: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', classes: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-800' },
}

export function PartnerStatusBadge({ status }) {
  const entry = PARTNER_STATUS[status] || PARTNER_STATUS.draft
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.classes}`}>
      {entry.label}
    </span>
  )
}

const USER_STATUS = {
  active: { label: 'Active', classes: 'bg-brand-100 text-brand-800' },
  suspended: { label: 'Suspended', classes: 'bg-amber-100 text-amber-800' },
  deleted: { label: 'Deleted', classes: 'bg-red-100 text-red-800' },
}

export function UserStatusBadge({ status }) {
  const entry = USER_STATUS[status] || USER_STATUS.active
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.classes}`}>
      {entry.label}
    </span>
  )
}
