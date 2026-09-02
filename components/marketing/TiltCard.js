'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]
const MAX_TILT_DEG = 7

// Scale-up + soft shadow lift + a small cursor-relative 3D tilt, for the
// seven pillar cards. prefers-reduced-motion drops straight to a plain
// opacity dip — no scale, no tilt, no shadow motion.
export default function TiltCard({ children, className = '' }) {
  const ref = useRef(null)
  const reduceMotion = useReducedMotion()

  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springX = useSpring(rotateX, { stiffness: 300, damping: 22, mass: 0.6 })
  const springY = useSpring(rotateY, { stiffness: 300, damping: 22, mass: 0.6 })

  function handleMouseMove(e) {
    if (reduceMotion || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    rotateY.set(px * MAX_TILT_DEG * 2)
    rotateX.set(-py * MAX_TILT_DEG * 2)
  }

  function handleMouseLeave() {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 800 }}
      className={className}
    >
      <motion.div
        style={
          reduceMotion
            ? undefined
            : { rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d' }
        }
        whileHover={
          reduceMotion
            ? { opacity: 0.85 }
            : { scale: 1.02, boxShadow: '0 20px 40px -14px rgb(var(--color-signal) / 0.3)' }
        }
        transition={{ duration: 0.2, ease: EASE }}
        className="h-full"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
