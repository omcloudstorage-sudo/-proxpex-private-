'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import UserMenu from '@/components/UserMenu'

const ROLE_HOME = { admin: '/admin', pm: '/pm', client: '/client', team_member: '/team' }

export default function TopNav() {
  const { profile } = useAuth()

  return (
    <header className="border-b border-line bg-surface/80 glass sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href={profile ? ROLE_HOME[profile.role] : '/'} className="flex items-center gap-2.5">
          <Logo className="h-8" />
          <span className="font-display text-lg font-bold text-ink tracking-tight hidden sm:inline">Proxpex</span>
        </Link>
        <UserMenu />
      </div>
    </header>
  )
}
