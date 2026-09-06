import { motion } from 'framer-motion'
import { authEnter } from '../../utils/motion'
import { Card } from '../ui/Primitives'

// A centred card on a plain background. Deliberately not a split-screen marketing
// layout: everyone who reaches this screen already works here.
export default function AuthCard({ title, subtitle, children }) {
  return (
    // dvh so the card centres in what a phone actually shows: at 100vh the browser's own
    // address bar is counted as usable height, and the card sits below the middle.
    <div className="app-ambient-bg flex min-h-dvh items-center justify-center px-4 py-12">
      <motion.div {...authEnter} className="w-full max-w-md">
        <p className="mb-6 text-center text-xl font-semibold tracking-tight text-brand-700">
          Mavio Global<span className="ml-2 font-normal text-ink-400">Internal Portal</span>
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
