'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'

const ROLE_HOME = { admin: '/admin', pm: '/pm', client: '/client', team_member: '/team', platform_owner: '/owner' }

export default function Home() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(ROLE_HOME[profile.role] || '/login')
    }
  }, [loading, user, profile, router])

  if (loading || (user && profile)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Logo className="h-9 animate-pulse" />
        <span className="text-slate text-sm">Loading Proxpex…</span>
      </div>
    )
  }

  return (
    <main className="min-h-screen page-fade flex flex-col relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(circle, #E7EDFE 0%, transparent 70%)' }}
      />

      <header className="px-8 py-6 flex items-center justify-between relative">
        <span className="flex items-center gap-2.5">
          <Logo className="h-8" />
          <span className="font-display text-lg font-bold text-ink tracking-tight">Proxpex</span>
        </span>
        <Link
          href="/login"
          className="text-sm font-medium px-4 py-2 rounded-full border border-ink/10 hover:border-ink/30 transition-colors bg-surface/60 backdrop-blur"
        >
          Sign in
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 relative">
        <div className="max-w-xl">
          <p className="font-mono text-xs tracking-widest text-signal uppercase mb-4">
            Kickoff → Requirements → UI/UX → Build → Launch
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-5">
            One shared roadmap for every client project.
          </h1>
          <p className="text-slate text-base md:text-lg leading-relaxed mb-8">
            Proxpex gives your clients a clear, live view of where their project stands —
            no more &ldquo;can you send an update?&rdquo; emails.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-signal text-white font-medium px-6 py-3 rounded-full hover:bg-signal-dark transition-colors shadow-card"
          >
            Sign in to your workspace
          </Link>

          <StagePreview />
        </div>
      </section>

      <footer className="px-8 py-6 text-xs text-slate-light text-center relative">
        Proxpex — a shared roadmap for your client projects
      </footer>
    </main>
  )
}

function StagePreview() {
  const stages = ['Kickoff', 'Requirements', 'UI/UX', 'Development', 'QA', 'Launch']
  return (
    <div className="mt-14 flex items-center justify-center">
      {stages.map((name, i) => (
        <div key={name} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className={[
                'w-2.5 h-2.5 rounded-full',
                i === 0 ? 'bg-progress' : i === 1 ? 'bg-signal ring-4 ring-signal-light' : 'bg-line',
              ].join(' ')}
            />
            <span className="hidden sm:block text-[10px] font-mono uppercase tracking-wide text-slate-light">
              {name}
            </span>
          </div>
          {i < stages.length - 1 && <div className="w-8 sm:w-12 h-px bg-line mx-1 sm:mx-2" />}
        </div>
      ))}
    </div>
  )
}
