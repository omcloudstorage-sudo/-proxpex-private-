'use client'

import { useEffect, useState } from 'react'

// Animates its fill from 0 to `pct` on mount/reveal — a subtle "pop" rather
// than appearing instantly at full width.
export default function ProgressBar({ pct, className = '' }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(pct))
    return () => cancelAnimationFrame(frame)
  }, [pct])

  return (
    <div className={`h-1.5 w-full bg-line rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-progress rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
