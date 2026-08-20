'use client'

import { Sun, Moon, Check } from 'lucide-react'
import { useTheme, ACCENTS } from '@/contexts/ThemeContext'

// Shared "Appearance" control set: light/dark toggle + accent color swatches.
// Preferences are saved to this browser only (localStorage), not synced
// server-side. Used in Settings pages and the account menu.
export default function AppearanceControls({ compact = false }) {
  const { theme, setTheme, accent, setAccent } = useTheme()

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">Theme</div>
        <div className="inline-flex rounded-lg border border-line p-1 gap-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={[
              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
              theme === 'light' ? 'bg-signal text-white' : 'text-slate hover:text-ink',
            ].join(' ')}
          >
            <Sun className="w-3.5 h-3.5" strokeWidth={2} /> Light
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={[
              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
              theme === 'dark' ? 'bg-signal text-white' : 'text-slate hover:text-ink',
            ].join(' ')}
          >
            <Moon className="w-3.5 h-3.5" strokeWidth={2} /> Dark
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">Accent color</div>
        <div className="flex items-center gap-2 flex-wrap">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              type="button"
              title={a.label}
              onClick={() => setAccent(a.key)}
              className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-surface transition-shadow"
              style={{
                backgroundColor: `rgb(${a.rgb})`,
                '--tw-ring-color': accent === a.key ? `rgb(${a.rgb})` : 'transparent',
              }}
            >
              {accent === a.key && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
