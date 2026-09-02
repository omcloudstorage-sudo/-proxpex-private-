'use client'

import { motion, useReducedMotion } from 'framer-motion'
import RexIcon from '@/components/RexIcon'

// Home page hero idle animation: Rex at a small laptop. His arms are too
// short to type properly, so every few seconds he leans forward and
// "bashes" his head on the keyboard instead, then springs back upright —
// reuses the real RexIcon sprite (compact/idle), just choreographed with
// a periodic forward-lean loop rather than a new drawing.
//
// IMPORTANT: no two ADJACENT keyframe values may be identical (e.g.
// [0, 0, -16, ...]) — Framer Motion 11.18's repeat:Infinity silently
// stops repeating after the first cycle when a keyframe track has a
// duplicate back-to-back value (confirmed via isolated testing; first
// and last values matching is fine, since they aren't adjacent). The
// idle pause between bashes comes from `repeatDelay` below, not from
// padding the array with a held rest value.
const BASH_KEYFRAMES = {
  rotate: [0, -16, -4, 0],
  y: ['0%', '14%', '4%', '0%'],
}
const BASH_TIMES = [0, 0.4, 0.65, 1]
const BASH_TRANSITION = {
  duration: 1.2,
  times: BASH_TIMES,
  repeat: Infinity,
  repeatDelay: 2.4,
  ease: 'easeInOut',
}

export default function RexLaptopHero({ className = '' }) {
  const reduceMotion = useReducedMotion()

  return (
    <div className={`relative ${className}`}>
      {/* Laptop, drawn as the same flat-block style as Rex himself — no
          new illustration language introduced. */}
      <svg viewBox="0 0 120 70" className="absolute inset-x-0 bottom-[6%] w-[78%] mx-auto h-auto" aria-hidden="true">
        <rect x="10" y="52" width="100" height="8" rx="2.5" fill="rgb(var(--color-slate) / 0.35)" />
        <rect x="18" y="16" width="84" height="38" rx="3" fill="rgb(var(--color-surface))" stroke="rgb(var(--color-line))" strokeWidth="2" />
        <rect x="24" y="22" width="72" height="26" rx="1.5" fill="rgb(var(--color-paper))" />
        <rect x="24" y="48" width="72" height="4" fill="rgb(var(--color-line))" />
      </svg>

      {/* Rex, leaning over the keyboard, head-bashing on a loop */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 bottom-[26%] w-[52%]"
        style={{ transformOrigin: '50% 90%' }}
        animate={reduceMotion ? undefined : BASH_KEYFRAMES}
        transition={reduceMotion ? undefined : BASH_TRANSITION}
      >
        <RexIcon variant="compact" state="idle" className="w-full h-full" />
      </motion.div>
    </div>
  )
}
