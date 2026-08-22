'use client'

import { useEffect, useRef, useState } from 'react'

// Animates a number from 0 up to `target` on mount / whenever `target`
// changes, easing out so it settles rather than ticking linearly. Used for
// the dashboard's stat cards. Skips the animation (jumps straight to the
// final value) under prefers-reduced-motion.
export function useCountUp(target, { duration = 900 } = {}) {
  const [value, setValue] = useState(0)
  const frame = useRef(null)

  useEffect(() => {
    const numericTarget = Number(target) || 0
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setValue(numericTarget)
      return
    }

    const start = performance.now()
    function tick(now) {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(numericTarget * eased)
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [target, duration])

  return value
}
