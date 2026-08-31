import { motion } from 'framer-motion'
import { fadeUpItem, listItem, staggerContainer } from '../../utils/motion'

/** Staggered page wrapper — pair with PageHeader / PageSection children. */
export default function PageMotion({ children, className = '' }) {
  return (
    <motion.div className={className} variants={staggerContainer} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}

export function PageSection({ children, className = '' }) {
  return (
    <motion.div variants={fadeUpItem} className={className}>
      {children}
    </motion.div>
  )
}

export function MotionList({ as: Tag = motion.ul, children, className = '' }) {
  return (
    <Tag className={className} variants={staggerContainer} initial="hidden" animate="show">
      {children}
    </Tag>
  )
}

export function MotionRow({ as: Tag = motion.li, children, className = '', ...props }) {
  return (
    <Tag variants={listItem} className={className} {...props}>
      {children}
    </Tag>
  )
}
