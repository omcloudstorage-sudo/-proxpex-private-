'use client'

import { useState } from 'react'

// Renders public/logo.png — falls back to a coded wordmark if it's ever
// missing, so swapping the file in doesn't require a code change.
export default function Logo({ className = 'h-6', variant = 'light' }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (!imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo.png"
        alt="Proxpex"
        className={`${className} w-auto`}
        onError={() => setImgFailed(true)}
      />
    )
  }

  const textColor = variant === 'dark' ? 'text-white' : 'text-ink'

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="rounded-md bg-gradient-to-br from-signal to-signal-dark flex items-center justify-center text-white font-display font-bold flex-shrink-0 w-[1em] h-[1em] text-[1.2rem]">
        <span style={{ fontSize: '0.55em' }}>P</span>
      </span>
      <span className={`font-display font-semibold tracking-tight ${textColor}`}>proxpex</span>
    </span>
  )
}
