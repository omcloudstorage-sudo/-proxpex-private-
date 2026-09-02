'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MotionConfig } from 'framer-motion'
import { Map, LayoutGrid, ShieldCheck, FileCheck2, ClipboardList, Receipt, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import InteractiveRoadmapDemo from '@/components/marketing/InteractiveRoadmapDemo'
import ScrollHorizon from '@/components/marketing/ScrollHorizon'
import TiltCard from '@/components/marketing/TiltCard'
import MotionCTA from '@/components/marketing/MotionCTA'
import RexPillarCard from '@/components/marketing/RexPillarCard'

const ROLE_HOME = { admin: '/admin', pm: '/pm', client: '/client', team_member: '/team', platform_owner: '/owner' }

const PILLARS = [
  {
    icon: Map,
    title: 'A roadmap, not a status report.',
    body: 'Every project unfolds as a visual timeline — kickoff to launch — that your client can read at a glance, no translation required.',
  },
  {
    icon: LayoutGrid,
    title: 'Real project management, not a wishlist.',
    body: 'A full sprint board for every stage — tasks, subtasks, assignees, comments — visible to your client, not just your team.',
  },
  {
    icon: ShieldCheck,
    title: "A record that can't be quietly rewritten.",
    body: 'Every change is written to a permanent log. Not hidden from editing. Structurally incapable of it.',
  },
  {
    icon: FileCheck2,
    title: 'Sign-off that means something.',
    body: 'Draft your meeting minutes, share them, and once your client approves, they lock permanently.',
  },
  {
    icon: ClipboardList,
    title: 'A proper intake, not a scattered thread.',
    body: 'Structured requirement sheets, collected once, sensitive fields masked until deliberately revealed.',
  },
  {
    icon: Receipt,
    title: 'Get paid without the back-and-forth.',
    body: 'Real invoices, tracked per milestone, attached documents your client can view — no separate accounting thread.',
  },
  {
    icon: Sparkles,
    title: 'Rex, always on hand.',
    body: 'An assistant that already knows your projects — ask him to find a document or check what’s overdue, instead of hunting for it yourself.',
    isRex: true,
  },
]

// Rotates through our existing light-tint tokens for tile variety — no
// colors outside the palette already defined in globals.css.
const TILE_TINTS = [
  { bg: 'bg-signal-light', icon: 'text-signal' },
  { bg: 'bg-progress-light', icon: 'text-progress' },
  { bg: 'bg-amber-light', icon: 'text-amber' },
  { bg: 'bg-coral-light', icon: 'text-coral' },
]

const STEPS = [
  { n: '01', title: 'Set up your workspace', body: 'Create your company, invite your team, bring your first project in.' },
  { n: '02', title: 'Build the roadmap', body: 'Lay out stages, tasks, requirements — the real plan, not a summary of it.' },
  { n: '03', title: 'Your client watches it happen', body: 'Every update, every sign-off, every invoice — visible the moment it changes.' },
]

export default function HomePage() {
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
    <MotionConfig reducedMotion="user">
    <ScrollHorizon />
    <main className="page-fade">
      <header className="px-8 flex items-stretch justify-between max-w-6xl mx-auto h-20">
        <span className="flex items-center gap-2.5">
          <Logo className="h-8" />
          <span className="font-display text-lg font-bold text-ink tracking-tight">Proxpex</span>
        </span>
        <div className="flex items-center">
          <MotionCTA
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-full border border-ink/10 bg-surface/60 backdrop-blur"
          >
            Sign in
          </MotionCTA>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center relative">
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-5">
            A roadmap your clients can actually see.
          </h1>
          <p className="text-slate text-base md:text-lg leading-relaxed mb-8 max-w-lg">
            Proxpex turns project status into something visible, not something requested. Every stage, every task,
            every decision — laid out clearly, updated live, signed off with a permanent record.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <MotionCTA
              href="/access"
              primary
              className="inline-flex items-center gap-2 bg-signal text-white font-medium px-6 py-3 rounded-full shadow-card"
            >
              Request early access
            </MotionCTA>
            <MotionCTA
              href="/access"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink px-5 py-3 rounded-full border border-ink/10"
            >
              Have a code? Enter it <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </MotionCTA>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink tracking-tight mb-4">
          Status updates shouldn&rsquo;t be a chore.
        </h2>
        <p className="text-slate text-base md:text-lg leading-relaxed">
          Somewhere between the work and the client sits a gap — filled with emails, check-in calls, and &ldquo;just
          circling back on this.&rdquo; That gap is where trust quietly erodes. Proxpex closes it: your client sees
          exactly where things stand, the moment it changes, without anyone having to say so.
        </p>
      </section>

      {/* SEVEN PILLARS */}
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-6">
          {PILLARS.map(({ icon: Icon, title, body, isRex }, i) => {
            const tint = TILE_TINTS[i % TILE_TINTS.length]
            if (isRex) {
              return <RexPillarCard key={title} tint={tint} />
            }
            return (
              <TiltCard key={title}>
                <div className={`relative h-full ${tint.bg} rounded-card p-8 md:p-10`}>
                  <div
                    className={`absolute top-6 right-6 md:top-7 md:right-7 w-10 h-10 md:w-11 md:h-11 rounded-full bg-surface ${tint.icon} flex items-center justify-center shadow-card`}
                  >
                    <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2} />
                  </div>
                  <div className="pr-14 md:pr-16">
                    <h3 className="font-display text-xl md:text-2xl font-bold text-ink tracking-tight mb-2.5">{title}</h3>
                    <p className="text-sm md:text-base text-slate leading-relaxed max-w-xl">{body}</p>
                  </div>
                </div>
              </TiltCard>
            )
          })}
        </div>
      </section>

      {/* INTERACTIVE ROADMAP */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <InteractiveRoadmapDemo />
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink tracking-tight text-center mb-10">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="font-mono text-sm text-signal font-semibold">{s.n}</span>
              <h3 className="font-display text-lg font-semibold text-ink mt-2 mb-2">{s.title}</h3>
              <p className="text-sm text-slate leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CLOSING */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink tracking-tight mb-8">
          Show the work. Don&rsquo;t explain it.
        </h2>
        <MotionCTA
          href="/access"
          primary
          className="inline-flex items-center gap-2 bg-signal text-white font-medium px-7 py-3.5 rounded-full shadow-card"
        >
          Request early access
        </MotionCTA>
      </section>

      <footer className="px-8 py-8 text-xs text-slate-light text-center">
        Proxpex — a shared roadmap for your client projects
      </footer>
    </main>
    </MotionConfig>
  )
}
