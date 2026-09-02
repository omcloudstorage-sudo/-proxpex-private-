import Link from 'next/link'
import { MotionConfig } from 'framer-motion'
import { Search, PenLine, Wind, Moon, ShieldOff } from 'lucide-react'
import Logo from '@/components/Logo'
import RexIcon from '@/components/RexIcon'
import RexHeroAnimation from '@/components/marketing/RexHeroAnimation'
import MotionCTA from '@/components/marketing/MotionCTA'

export const metadata = {
  title: 'Meet Rex — Proxpex',
  description:
    "Rex is Proxpex's built-in AI assistant — he already knows your projects, so ask him to find a document or check what's overdue instead of hunting for it yourself.",
}

const STATES = [
  { state: 'idle', label: 'Idle', icon: Moon, body: 'At rest, waiting for a question.' },
  { state: 'searching', label: 'Searching', icon: Search, body: 'A tool call is actually running — he’s looking, not stalling.' },
  { state: 'writing', label: 'Writing', icon: PenLine, body: 'The answer is being put together, right now.' },
  { state: 'running', label: 'On his way', icon: Wind, body: 'Roaming across the screen toward whatever you just asked about.' },
]

const PROMPTS = [
  'What’s overdue on the Davico project?',
  'Find the signed SOW for Aurora Retail.',
  'Who’s the PM on the Northwind account?',
  'What did the client say in the last meeting minutes?',
  'Is there a Google Cloud key in requirements?',
]

export default function RexPage() {
  return (
    <MotionConfig reducedMotion="user">
    <main className="page-fade min-h-screen">
      <header className="px-8 py-6 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-8" />
          <span className="font-display text-lg font-bold text-ink tracking-tight">Proxpex</span>
        </Link>
        <MotionCTA
          href="/access"
          className="text-sm font-medium px-4 py-2 rounded-full border border-ink/10"
        >
          Request early access
        </MotionCTA>
      </header>

      {/* HERO */}
      <section className="max-w-3xl mx-auto px-6 pt-10 pb-16 text-center">
        <RexHeroAnimation className="w-24 h-24 mx-auto mb-6" />
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-5">
          This is Rex.
        </h1>
        <p className="text-slate text-base md:text-lg leading-relaxed max-w-xl mx-auto">
          Proxpex&rsquo;s built-in assistant — named for the Rx logo, a small T-Rex. He already knows your projects,
          so ask him to find a document or check what&rsquo;s overdue instead of hunting for it yourself.
        </p>
      </section>

      {/* FOUR STATES */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STATES.map(({ state, label, icon: Icon, body }) => (
            <div key={state} className="bg-surface border border-line rounded-card shadow-card p-6 text-center">
              <div className="h-28 flex items-center justify-center mb-4">
                <RexIcon variant="compact" state={state} className="w-20 h-20" />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-ink mb-1.5">
                <Icon className="w-3.5 h-3.5 text-signal" strokeWidth={2.5} />
                {label}
              </div>
              <p className="text-xs text-slate leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXAMPLE PROMPTS */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="font-display text-2xl font-semibold text-ink tracking-tight text-center mb-8">
          Ask him things like
        </h2>
        <div className="flex flex-col gap-3">
          {PROMPTS.map((p) => (
            <div
              key={p}
              className="bg-surface border border-line rounded-card shadow-card px-5 py-3.5 text-sm text-ink font-medium"
            >
              &ldquo;{p}&rdquo;
            </div>
          ))}
        </div>
      </section>

      {/* THE RULE HE NEVER BREAKS */}
      <section className="max-w-2xl mx-auto px-6 pb-20">
        <div className="bg-surface border border-line rounded-card shadow-card p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-signal-light text-signal flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink mb-3">The rule he never breaks</h2>
          <p className="text-sm text-slate leading-relaxed">
            Rex never invents an answer. He only ever tells you what a real lookup actually returned — scoped to
            exactly what you can already see in your own projects. If a requirement field is sensitive, he&rsquo;ll
            point you to it, never show you the value. If he can&rsquo;t find something, he says so, plainly, and
            tells you what he did find instead of guessing.
          </p>
        </div>
      </section>

      <footer className="px-8 py-8 text-xs text-slate-light text-center">
        Proxpex — a shared roadmap for your client projects
      </footer>
    </main>
    </MotionConfig>
  )
}
