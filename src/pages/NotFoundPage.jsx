import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Primitives'
import { fadeUpItem, staggerContainer } from '../utils/motion'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <motion.div
        className="flex flex-col items-center gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.h1 variants={fadeUpItem} className="text-3xl font-semibold text-ink-900">
          Page not found
        </motion.h1>
        <motion.p variants={fadeUpItem} className="text-sm text-ink-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </motion.p>
        <motion.div variants={fadeUpItem}>
          <Button as={Link} to="/">
            Back to the portal
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
