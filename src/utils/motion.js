// Shared framer-motion presets — one place to tune page feel across the portal.

const EASE_OUT = [0.22, 1, 0.36, 1]
const EASE_IN = [0.4, 0, 1, 1]

export const routeTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: EASE_IN } },
}

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
}

export const fadeUpItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
}

export const fadeInItem = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.28, ease: EASE_OUT } },
}

export const scaleInItem = {
  hidden: { opacity: 0, scale: 0.98, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
}

export const listItem = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.24, ease: EASE_OUT } },
}

export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
}

export const modalPanel = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.18, ease: EASE_IN } },
}

export const authEnter = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.36, ease: EASE_OUT } },
}
