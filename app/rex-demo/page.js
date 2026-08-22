'use client'

import { useState } from 'react'
import RexIcon from '@/components/RexIcon'
import RexWidget from '@/components/RexWidget'

// Temporary, unauthenticated demo page to eyeball Rex's four animation
// states side by side before wiring the real widget. Safe to delete once
// the character part of the AI assistant feature is signed off.
const STATES = ['idle', 'searching', 'writing', 'found']

function StateRow({ variant, tileSize, iconSize }) {
  const [foundKey, setFoundKey] = useState(0)
  return (
    <div className="flex gap-10">
      {STATES.map((s) => (
        <div key={s} className="flex flex-col items-center gap-3">
          <div
            className={`${tileSize} rounded-2xl border border-line bg-surface shadow-card flex items-center justify-center cursor-pointer`}
            onClick={() => s === 'found' && setFoundKey((k) => k + 1)}
          >
            <div className={iconSize}>
              <RexIcon key={s === 'found' ? foundKey : undefined} variant={variant} state={s} />
            </div>
          </div>
          <span className="text-sm font-semibold text-slate capitalize">{s}</span>
        </div>
      ))}
    </div>
  )
}

export default function RexDemoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-12 bg-paper p-10">
      <h1 className="font-display text-2xl font-bold text-ink">Rex — character states</h1>

      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-light">Detailed (chat panel)</span>
        <StateRow variant="detailed" tileSize="w-28 h-28" iconSize="w-16 h-16" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-light">Compact (launcher button, 64px)</span>
        <StateRow variant="compact" tileSize="w-16 h-16 !rounded-2xl" iconSize="w-8 h-8" />
      </div>

      <p className="text-xs text-slate-light max-w-md text-center">
        Click a "found" tile to replay its two-frame jaw-drop.
      </p>
      {/* TEMP: real floating button for visual QA — remove before shipping */}
      <RexWidget />
    </div>
  )
}
