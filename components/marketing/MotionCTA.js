'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const MotionLink = motion.create(Link)

const EASE = [0.22, 1, 0.36, 1]

// Shared hover treatment for every marketing CTA — slight scale + a
// brightness lift, quick natural easing. Wrapped pages set
// <MotionConfig reducedMotion="user"> once, which strips the
// transform (scale) half of this automatically when the visitor has
// prefers-reduced-motion on, leaving just the color/brightness change.
export default function MotionCTA({ href, className = '', children, primary = false }) {
  return (
    <MotionLink
      href={href}
      className={className}
      whileHover={
        primary
          ? { scale: 1.045, filter: 'brightness(1.08)' }
          : { scale: 1.045, borderColor: 'rgb(var(--color-signal))', color: 'rgb(var(--color-signal))' }
      }
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18, ease: EASE }}
    >
      {children}
    </MotionLink>
  )
}
