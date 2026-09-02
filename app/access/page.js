'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, MotionConfig } from 'framer-motion'
import { KeyRound, ArrowRight, Check } from 'lucide-react'
import Logo from '@/components/Logo'
import { submitBetaRequest } from '@/lib/betaRequests'
import MotionCTA from '@/components/marketing/MotionCTA'

const EASE = [0.22, 1, 0.36, 1]

export default function AccessPage() {
  return (
    <MotionConfig reducedMotion="user">
    <main className="min-h-screen page-fade flex flex-col">
      <header className="px-8 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-8" />
          <span className="font-display text-lg font-bold text-ink tracking-tight">Proxpex</span>
        </Link>
        <MotionCTA
          href="/login"
          className="text-sm font-medium px-4 py-2 rounded-full border border-ink/10"
        >
          Sign in
        </MotionCTA>
      </header>

      <section className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-ink tracking-tight mb-2">Get into Proxpex</h1>
            <p className="text-slate text-sm">Already have a code? Enter it below. Otherwise, request early access.</p>
          </div>

          <AccessCodeForm />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-light">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <RequestAccessForm />
        </div>
      </section>
    </main>
    </MotionConfig>
  )
}

function AccessCodeForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle') // idle | checking | invalid
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim()) return
    setStatus('checking')
    setError(null)
    try {
      const res = await fetch('/api/access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.valid) {
        router.push('/login')
        return
      }
      setStatus('invalid')
    } catch (err) {
      setError('Could not verify that code — try again.')
      setStatus('idle')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-card shadow-card p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <KeyRound className="w-4 h-4 text-signal" strokeWidth={2.5} />
        Have a code?
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value); setStatus('idle') }}
          placeholder="Enter access code"
          className="flex-1 border border-line rounded-full px-4 py-2.5 text-sm font-mono tracking-wide focus:outline-none focus:border-signal bg-paper"
        />
        <motion.button
          type="submit"
          disabled={status === 'checking'}
          whileHover={status === 'checking' ? undefined : { scale: 1.045, filter: 'brightness(1.08)' }}
          whileTap={status === 'checking' ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="inline-flex items-center gap-1.5 bg-signal text-white font-medium px-5 py-2.5 rounded-full disabled:opacity-60"
        >
          {status === 'checking' ? 'Checking…' : <>Enter <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} /></>}
        </motion.button>
      </div>
      {status === 'invalid' && <p className="text-sm text-coral">That code isn&rsquo;t valid — double-check it, or request access below.</p>}
      {error && <p className="text-sm text-coral">{error}</p>}
    </form>
  )
}

function RequestAccessForm() {
  const [form, setForm] = useState({ name: '', email: '', company: '', description: '' })
  const [status, setStatus] = useState('idle') // idle | submitting | done
  const [error, setError] = useState(null)

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setStatus('submitting')
    setError(null)
    try {
      await submitBetaRequest(form)
      setStatus('done')
    } catch (err) {
      setError('Could not submit your request — try again.')
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div className="bg-surface border border-line rounded-card shadow-card p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-progress-light text-progress flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <p className="text-sm font-semibold text-ink mb-1">Request received.</p>
        <p className="text-sm text-slate">We&rsquo;ll follow up by email once a spot opens up.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-card shadow-card p-6 space-y-3">
      <div className="text-sm font-semibold text-ink mb-1">Request access</div>
      <input
        type="text" required value={form.name} onChange={update('name')} placeholder="Your name"
        className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal bg-paper"
      />
      <input
        type="email" required value={form.email} onChange={update('email')} placeholder="Email"
        className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal bg-paper"
      />
      <input
        type="text" value={form.company} onChange={update('company')} placeholder="Company"
        className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal bg-paper"
      />
      <textarea
        rows={3} value={form.description} onChange={update('description')} placeholder="What are you building?"
        className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal bg-paper resize-none"
      />
      {error && <p className="text-sm text-coral">{error}</p>}
      <motion.button
        type="submit"
        disabled={status === 'submitting'}
        whileHover={status === 'submitting' ? undefined : { scale: 1.03, filter: 'brightness(1.08)' }}
        whileTap={status === 'submitting' ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.18, ease: EASE }}
        className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-signal px-5 py-2.5 rounded-full disabled:opacity-60"
      >
        {status === 'submitting' ? 'Submitting…' : 'Request early access'}
      </motion.button>
    </form>
  )
}
