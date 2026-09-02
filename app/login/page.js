'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('signin') // 'signin' | 'admin-signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [verifying, setVerifying] = useState(false)

  function goHome(e) {
    e.preventDefault()
    if (leaving) return
    setLeaving(true)
    setTimeout(() => router.push('/'), 280)
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace('/')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleAdminSignup(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    setVerifying(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(cred.user)
      const companyRef = doc(collection(db, 'companies'))
      await setDoc(companyRef, {
        name: companyName,
        ownerId: cred.user.uid,
        contactName: name,
        contactEmail: email,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'users', cred.user.uid), {
        role: 'admin',
        companyId: companyRef.id,
        name,
        email,
        createdAt: serverTimestamp(),
      })
      router.replace('/')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
      setVerifying(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err) {
      // Don't reveal whether the email is registered.
      if (err?.code === 'auth/user-not-found') {
        setResetSent(true)
      } else {
        setError(friendlyError(err))
      }
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setResetSent(false)
  }

  return (
    <main className="min-h-screen flex">
      {/* Transform/opacity live on this inner wrapper, not <main> itself — a
          transform on the outermost element would create a stacking context
          that traps the fixed, negative-z-index EmberField behind it. */}
      <div
        className={[
          'flex w-full transition-all duration-300 ease-in',
          leaving ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100',
        ].join(' ')}
      >
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-[#0F172A] flex-col justify-between p-12">
        <div
          className="pointer-events-none absolute -top-24 -left-24 w-[32rem] h-[32rem] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #2F5AF0 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 w-[26rem] h-[26rem] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #009668 0%, transparent 70%)' }}
        />

        <a
          href="/"
          onClick={goHome}
          className="relative flex items-center gap-3 w-fit transition-transform duration-200 hover:scale-[1.03] active:scale-95"
        >
          <span className="bg-white rounded-xl p-2 shadow-card flex-shrink-0">
            <Logo className="h-8" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold text-white tracking-tight">Proxpex</span>
            <span className="text-[11px] font-medium text-white/50 uppercase tracking-wide mt-1">Enterprise Management</span>
          </span>
        </a>

        <div className="relative">
          <p className="font-mono text-xs tracking-widest text-white/50 uppercase mb-4">
            Kickoff → Requirements → UI/UX → Build → Launch
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight leading-[1.15] text-white mb-5 max-w-md">
            One shared roadmap for every client project.
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-md">
            A single, live source of truth for kickoff through launch — no more &ldquo;can you send an update?&rdquo; emails.
          </p>
          <StagePreview />
        </div>

        <p className="relative text-xs text-white/35">© {new Date().getFullYear()} Proxpex. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-sm">
          <a
            href="/"
            onClick={goHome}
            className="mb-8 flex lg:hidden items-center justify-center gap-2.5 w-fit mx-auto transition-transform duration-200 hover:scale-[1.03] active:scale-95"
          >
            <Logo className="h-8" />
            <span className="font-display text-lg font-bold text-ink tracking-tight">Proxpex</span>
          </a>

          <h1 className="font-display text-[28px] font-bold text-ink tracking-tight mb-1">
            {mode === 'signin' ? 'Welcome back' : mode === 'forgot' ? 'Reset your password' : 'Create your company workspace'}
          </h1>
          <p className="text-sm text-slate mb-8">
            {mode === 'signin'
              ? 'Sign in to your Proxpex workspace.'
              : mode === 'forgot'
              ? 'Enter your email and we’ll send you a link to reset your password.'
              : 'This creates the Admin account for a new company.'}
          </p>

          {mode === 'forgot' ? (
            resetSent ? (
              <div className="space-y-4">
                <p className="text-sm text-slate">
                  If an account exists for <span className="font-semibold text-ink">{email}</span>, a password reset link has been sent.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="w-full bg-signal text-white font-semibold py-3 rounded-lg hover:bg-signal-dark transition-colors shadow-card"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Field label="Email" type="email" value={email} onChange={setEmail} required />

                {error && <p className="text-sm text-coral">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-signal text-white font-semibold py-3 rounded-lg hover:bg-signal-dark transition-colors disabled:opacity-50 shadow-card"
                >
                  {busy ? 'Please wait…' : 'Send reset link'}
                </button>
              </form>
            )
          ) : (
            <form onSubmit={mode === 'signin' ? handleSignIn : handleAdminSignup} className="space-y-4">
              {mode === 'admin-signup' && (
                <>
                  <Field label="Your name" value={name} onChange={setName} required />
                  <Field label="Company name" value={companyName} onChange={setCompanyName} required />
                </>
              )}
              <Field label="Email" type="email" value={email} onChange={setEmail} required />
              <Field label="Password" type="password" value={password} onChange={setPassword} required />

              {mode === 'signin' && (
                <div className="flex justify-end -mt-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-signal"
                    onClick={() => switchMode('forgot')}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && <p className="text-sm text-coral">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-signal text-white font-semibold py-3 rounded-lg hover:bg-signal-dark transition-colors disabled:opacity-50 shadow-card"
              >
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create workspace'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate mt-6">
            {mode === 'signin' ? (
              <>
                First time here?{' '}
                <button className="text-signal font-semibold" onClick={() => switchMode('admin-signup')}>
                  Set up your company
                </button>
              </>
            ) : (
              <>
                {mode === 'forgot' ? 'Remembered your password?' : 'Already have a workspace?'}{' '}
                <button className="text-signal font-semibold" onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </>
            )}
          </p>
          {mode === 'signin' && (
            <p className="text-center text-xs text-slate-light mt-2">
              Project managers and clients: use the email &amp; password your company admin set up for you.
            </p>
          )}
        </div>
      </div>
      </div>

      {verifying && <VerifyingOverlay />}
    </main>
  )
}

function VerifyingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-card px-8 py-7 flex flex-col items-center gap-4 max-w-xs mx-4">
        <div className="w-9 h-9 border-[3px] border-signal/20 border-t-signal rounded-full animate-spin" />
        <p className="text-sm font-semibold text-ink text-center">Please wait, verifying your account…</p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface text-ink border border-line rounded-lg px-3.5 py-2.5 text-sm focus:border-signal outline-none transition-colors"
      />
    </label>
  )
}

function StagePreview() {
  const stages = ['Kickoff', 'Requirements', 'UI/UX', 'Development', 'QA', 'Launch']
  return (
    <div className="mt-8 flex items-center">
      {stages.map((name, i) => (
        <div key={name} className="flex items-center">
          <div
            className={[
              'w-2 h-2 rounded-full',
              i === 0 ? 'bg-progress' : i === 1 ? 'bg-signal ring-4 ring-signal/20' : 'bg-white/20',
            ].join(' ')}
          />
          {i < stages.length - 1 && <div className="w-8 h-px bg-white/15 mx-1.5" />}
        </div>
      ))}
    </div>
  )
}

function friendlyError(err) {
  const code = err?.code || ''
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Incorrect email or password.'
  }
  if (code.includes('email-already-in-use')) return 'That email is already registered.'
  if (code.includes('weak-password')) return 'Password should be at least 6 characters.'
  return 'Something went wrong. Please try again.'
}
