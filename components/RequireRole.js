'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'

export default function RequireRole({ role, children }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  const allowed = Array.isArray(role) ? role : [role]

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (profile && !allowed.includes(profile.role)) {
      router.replace('/')
    }
  }, [loading, user, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !user || !profile || !allowed.includes(profile.role)) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-3">
        <Logo className="h-9 animate-pulse" />
        <span className="text-slate text-sm">Loading…</span>
      </div>
    )
  }

  return children
}
