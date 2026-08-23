'use client'

import { useRexPreferences } from '@/contexts/RexPreferencesContext'

// Toggle for Rex's dance-on-navigation behavior (run-in-place + jump in
// his fixed corner spot). Off = Rex reverts to a plain static icon, fixed
// bottom-right (still fully clickable/functional as the assistant) —
// never fully hidden, so the chat entry point never disappears. Separate
// from prefers-reduced-motion, which forces the same static behavior
// automatically regardless of this setting.
export default function RexPreferencesControls() {
  const { roamEnabled, setRoamEnabled } = useRexPreferences()

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-ink">Show Rex animations</div>
        <div className="text-xs text-slate-light mt-0.5">
          Rex does a little dance in the corner when you switch screens. Turn off to keep him as a still icon.
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={roamEnabled}
        onClick={() => setRoamEnabled(!roamEnabled)}
        className={[
          'flex-shrink-0 w-10 h-6 rounded-full transition-colors relative',
          roamEnabled ? 'bg-signal' : 'bg-line',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-card transition-transform',
            roamEnabled ? 'translate-x-[18px]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
