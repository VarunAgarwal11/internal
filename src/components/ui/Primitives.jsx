import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { fadeUpItem } from '../../utils/motion'

export function Card({ children, className = '', style, variant = 'solid' }) {
  const variantClass =
    variant === 'solid'
      ? 'rounded-xl border border-ink-200 bg-white shadow-sm'
      : variant === 'strong'
        ? 'glass-panel-strong rounded-xl'
        : 'glass-panel rounded-xl'
  return (
    <div className={`${variantClass} ${className}`} style={style}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, backTo, backLabel = 'Back', actions }) {
  return (
    <motion.div variants={fadeUpItem} className="mb-6">
      {backTo && (
        <Link
          to={backTo}
          className="mb-3 inline-block text-sm font-medium text-brand-700 underline decoration-brand-400 underline-offset-4 hover:text-brand-800"
        >
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </motion.div>
  )
}

const BUTTON_VARIANTS = {
  primary: 'btn-gradient-primary text-white focus-visible:outline-brand-600',
  secondary: 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
  ghost: 'text-ink-600 hover:bg-ink-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function Button({ variant = 'primary', className = '', as: As = 'button', ...props }) {
  // Tailwind v4's Preflight dropped the v3 default of `cursor: pointer` on <button>,
  // so it has to be set explicitly here or every button reverts to the native arrow cursor.
  const classes = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-normal transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`
  // Only the plain-button case gets the tap animation: `motion(As)` would mint a new
  // component identity every render for a polymorphic `as`, remounting (and losing
  // state/focus on) whatever it's set to, e.g. router <Link>.
  if (As === 'button') {
    return <motion.button whileTap={{ scale: 0.97 }} className={classes} {...props} />
  }
  return <As className={classes} {...props} />
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin text-brand-600 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-500">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function EmptyState({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
      {icon}
      <p className="text-base font-medium text-ink-800">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-500">{description}</p>}
    </div>
  )
}

const ALERT_TONES = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-green-200 bg-green-50 text-green-700',
  info: 'border-ink-200 bg-brand-50 text-ink-600',
}

export function Alert({ tone = 'error', children, className = '' }) {
  if (!children) return null
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-3 py-2 text-sm ${ALERT_TONES[tone]} ${className}`}
    >
      {children}
    </div>
  )
}

export function Label({ children, htmlFor, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`mb-1.5 block text-sm font-normal text-ink-700 ${className}`}>
      {children}
    </label>
  )
}

const fieldClasses =
  'glass-input w-full rounded-2xl px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus-visible:outline-none'

// className is destructured out and merged, not spread with the rest of props:
// spreading a caller's className after `className={fieldClasses}` would replace
// it outright (last attribute wins in JSX), silently dropping the border/width/
// padding/background for every field that also passes its own className.
// `icon`/`trailing` are opt-in: without them this stays a bare <input>, so no existing
// caller's layout changes.
export function Input({ className = '', icon, trailing, ...props }) {
  const input = (
    <input className={`${fieldClasses} ${icon ? 'pl-11' : ''} ${trailing ? 'pr-11' : ''} ${className}`} {...props} />
  )
  if (!icon && !trailing) return input
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>
      )}
      {input}
      {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>}
    </div>
  )
}

export function Select({ className = '', ...props }) {
  return <select className={`${fieldClasses} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${fieldClasses} ${className}`} {...props} />
}

export function ProgressBar({ pct = 0, className = '' }) {
  const width = `${Math.min(100, Math.max(0, pct))}%`
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-ink-100 ${className}`}>
      <motion.div
        className="h-full rounded-full bg-linear-to-r from-brand-400 to-brand-600"
        initial={false}
        animate={{ width }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  )
}
