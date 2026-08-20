'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import AppearanceControls from '@/components/AppearanceControls'

const ROLE_LABEL = { admin: 'Admin', pm: 'Project Manager', client: 'Client', team_member: 'Team Member' }

export default function UserMenu() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  if (!profile) return null

  return (
    <div className="flex items-center gap-4">
      <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wide text-slate bg-paper rounded-full px-3 py-1">
        {ROLE_LABEL[profile.role]}
      </span>
      <div className="hidden md:flex items-center gap-2.5 pl-4 border-l border-line">
        <div className="w-8 h-8 rounded-full bg-signal text-white flex items-center justify-center text-xs font-display font-semibold flex-shrink-0">
          {initials(profile.name)}
        </div>
        <div className="text-sm font-medium text-ink">{profile.name}</div>
      </div>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          title="Appearance"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate border border-line hover:border-signal hover:text-signal transition-colors"
        >
          <Palette className="w-4 h-4" strokeWidth={1.75} />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-surface/95 glass border border-line rounded-card shadow-card p-4 z-30">
            <AppearanceControls compact />
          </div>
        )}
      </div>

      <button
        onClick={signOut}
        className="text-sm font-semibold text-slate px-4 py-2 rounded-full border border-line hover:border-ink/30 hover:text-ink transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}

function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
