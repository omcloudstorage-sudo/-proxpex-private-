'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import RexIcon from '@/components/RexIcon'

// Rex hides behind/beneath the "Rex" nav TAB (a real full-height tab, not
// a rounded pill — flush against the header, square-ish top corners) and
// pops up on hover to peek out from about the waist up, then retreats on
// hover-out — same spring both directions, just reversed. Reuses the real
// RexIcon sprite (compact/idle), not a new drawing.
const REX_VARIANTS = {
  rest: { y: '100%' },
  hover: { y: '0%' },
}

const SPRING = { type: 'spring', stiffness: 340, damping: 16, mass: 0.7 }

export default function RexNavPeek() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className="relative h-full flex flex-col items-center justify-end self-stretch"
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      {/* Clipped peek window, shorter than the sprite itself so hover only
          ever reveals the top ~60% (torso/head) — the legs stay clipped
          off, reading as "waist up." Sits above the tab, overlapping
          slightly down into it so Rex reads as rising from behind it. */}
      <div
        className="w-11 h-7 overflow-hidden pointer-events-none relative z-0 mb-[-6px]"
        aria-hidden="true"
      >
        <motion.div
          variants={REX_VARIANTS}
          transition={reduceMotion ? { duration: 0 } : SPRING}
          className="w-11 h-11"
        >
          <RexIcon variant="compact" state="idle" className="w-11 h-11" />
        </motion.div>
      </div>

      <Link
        href="/rex"
        className="relative z-10 h-full min-h-[52px] flex items-center justify-center px-6 rounded-t-xl border border-b-0 border-ink/10 bg-surface hover:bg-paper transition-colors text-sm font-semibold text-ink"
      >
        Rex
      </Link>
    </motion.div>
  )
}
