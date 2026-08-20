'use client'

import { useEffect, useState } from 'react'
import { sendEmailVerification } from 'firebase/auth'
import { useAuth } from '@/contexts/AuthContext'
import { auth } from '@/lib/firebase'
import Logo from '@/components/Logo'

// Blocks access to the real dashboard while the signed-in account's email is
// unverified (admins only — they're the ones who self-signed-up) or while
// their company is pending/rejected. Admin/PM/Client/Team member layouts
// wrap their content in this, outside their data providers, so no company
// data is fetched until both gates pass.
export default function CompanyStatusGate({ children }) {
  const { user, profile, company, companyLoading, refreshUser } = useAuth()

  // Poll for live verification status while the gate is showing, so the
  // screen clears itself the moment the user clicks the email link —
  // without requiring a re-login.
  useEffect(() => {
    if (!user || user.emailVerified || profile?.role !== 'admin') return
    const interval = setInterval(refreshUser, 4000)
    return () => clearInterval(interval)
  }, [user, profile?.role, refreshUser])

  if (profile?.role === 'admin' && user && !user.emailVerified) {
    return <VerifyEmailPopup email={user.email} />
  }

  if (!profile?.companyId) return children
  if (companyLoading || !company) return <StatusPopup pulsing />

  if (company.status === 'pending') {
    return <StatusPopup title="Waiting for approval" message="Your company is awaiting approval. Check back soon." pulsing />
  }

  if (company.status === 'rejected') {
    return <StatusPopup title="Access not approved" message="Your company's request to use Proxpex was not approved. Contact whoever manages your Proxpex account if you think this is a mistake." />
  }

  return children
}

function VerifyEmailPopup({ email }) {
  const { signOut } = useAuth()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function resend() {
    setBusy(true)
    setError('')
    try {
      await sendEmailVerification(auth.currentUser)
      setSent(true)
    } catch (err) {
      setError('Could not send email. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 relative">
      <button
        onClick={signOut}
        className="absolute top-6 right-6 text-sm font-semibold text-slate px-4 py-2 rounded-full border border-line hover:border-ink/30 hover:text-ink transition-colors"
      >
        Sign out
      </button>

      <div className="bg-surface border border-line rounded-card shadow-card px-10 py-12 flex flex-col items-center text-center max-w-sm">
        <Logo className="h-12 mb-6" />
        <h1 className="font-display text-xl font-bold text-ink mb-2">Verify your email</h1>
        <p className="text-sm text-slate mb-6">
          We sent a verification link to <span className="font-semibold text-ink">{email}</span>. Click it, then this page will update automatically.
        </p>
        <button
          onClick={resend}
          disabled={busy || sent}
          className="text-sm font-semibold text-white bg-signal px-5 py-2.5 rounded-full hover:bg-signal-dark transition-colors disabled:opacity-50"
        >
          {sent ? 'Email sent' : busy ? 'Sending…' : 'Resend verification email'}
        </button>
        {error && <p className="text-xs text-coral mt-3">{error}</p>}
      </div>
    </div>
  )
}

function StatusPopup({ title, message, pulsing = false }) {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 relative">
      <button
        onClick={signOut}
        className="absolute top-6 right-6 text-sm font-semibold text-slate px-4 py-2 rounded-full border border-line hover:border-ink/30 hover:text-ink transition-colors"
      >
        Sign out
      </button>

      <div className="bg-surface border border-line rounded-card shadow-card px-10 py-12 flex flex-col items-center text-center max-w-sm">
        <Logo className={`h-12 mb-6 ${pulsing ? 'animate-pulse' : ''}`} />
        {title && <h1 className="font-display text-xl font-bold text-ink mb-2">{title}</h1>}
        {message && <p className="text-sm text-slate">{message}</p>}
      </div>
    </div>
  )
}
