'use client'

import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'

// Blocks access to the real dashboard while the signed-in account's company
// is pending or rejected. Admin/PM/Client/Team member layouts wrap their
// content in this, outside their data providers, so no company data is
// fetched until the company is approved.
export default function CompanyStatusGate({ children }) {
  const { profile, company, companyLoading } = useAuth()

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

      <div className="bg-white border border-line rounded-card shadow-card px-10 py-12 flex flex-col items-center text-center max-w-sm">
        <Logo className={`h-12 mb-6 ${pulsing ? 'animate-pulse' : ''}`} />
        {title && <h1 className="font-display text-xl font-bold text-ink mb-2">{title}</h1>}
        {message && <p className="text-sm text-slate">{message}</p>}
      </div>
    </div>
  )
}
