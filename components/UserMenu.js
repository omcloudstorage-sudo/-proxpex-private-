'use client'

import { useAuth } from '@/contexts/AuthContext'

const ROLE_LABEL = { admin: 'Admin', pm: 'Project Manager', client: 'Client', team_member: 'Team Member' }

export default function UserMenu() {
  const { profile, signOut } = useAuth()
  if (!profile) return null

  return (
    <div className="flex items-center gap-4">
      <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wide text-slate bg-paper rounded-full px-3 py-1">
        {ROLE_LABEL[profile.role]}
      </span>
      <div className="hidden md:flex items-center gap-2.5 pl-4 border-l border-line">
        <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-display font-semibold flex-shrink-0">
          {initials(profile.name)}
        </div>
        <div className="text-sm font-medium text-ink">{profile.name}</div>
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
