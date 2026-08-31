import { motion } from 'framer-motion'
import { authEnter } from '../../utils/motion'
import { Card } from '../ui/Primitives'

// A centred card on a plain background. Deliberately not a split-screen marketing
// layout: everyone who reaches this screen already works here.
export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="app-ambient-bg flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div {...authEnter} className="w-full max-w-md">
        <p className="mb-6 text-center text-xl font-semibold tracking-tight text-brand-700">
          Mavio Global<span className="ml-2 font-normal text-ink-400">Partner Portal</span>
        </p>
        <Card variant="strong" className="rounded-3xl p-7 sm:p-9">
          {title && <h1 className="text-xl font-semibold text-ink-900">{title}</h1>}
          {subtitle && <p className="mt-1 mb-6 text-sm text-ink-500">{subtitle}</p>}
          {children}
        </Card>
      </motion.div>
    </div>
  )
}
