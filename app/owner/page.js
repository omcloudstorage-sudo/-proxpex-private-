'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { Building2, Check, X, Clock } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import RequireRole from '@/components/RequireRole'
import Logo from '@/components/Logo'
import EmptyState from '@/components/EmptyState'

export default function OwnerPage() {
  return (
    <RequireRole role="platform_owner">
      <OwnerDashboard />
    </RequireRole>
  )
}

function OwnerDashboard() {
  const { signOut } = useAuth()
  const [companies, setCompanies] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'companies'),
      (snap) => {
        setError(null)
        setCompanies(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      },
      (err) => {
        console.error('Failed to load companies:', err)
        setError(err.message || 'Failed to load companies.')
      }
    )
    return unsub
  }, [])

  async function setStatus(companyId, status) {
    await updateDoc(doc(db, 'companies', companyId), { status })
  }

  const pending = (companies || []).filter((c) => c.status === 'pending').sort(byCreatedAtDesc)
  const approved = (companies || []).filter((c) => c.status === 'approved').sort(byCreatedAtDesc)
  const rejected = (companies || []).filter((c) => c.status === 'rejected').sort(byCreatedAtDesc)

  return (
    <div className="min-h-screen bg-paper">
      <header className="h-20 border-b border-line bg-white flex items-center justify-between px-8">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8" />
          <span className="font-display text-lg font-bold text-ink tracking-tight">Proxpex</span>
        </div>
        <button
          onClick={signOut}
          className="text-sm font-semibold text-slate px-4 py-2 rounded-full border border-line hover:border-ink/30 hover:text-ink transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10">
        <div className="mb-10">
          <h1 className="font-display text-[30px] font-bold text-ink tracking-tight">Companies</h1>
          <p className="text-slate text-base mt-1">Approve or reject new companies before they can use Proxpex.</p>
        </div>

        {error ? (
          <p className="text-sm text-coral">{error}</p>
        ) : companies === null ? (
          <p className="text-sm text-slate">Loading…</p>
        ) : (
          <div className="space-y-10">
            <Section title="Pending approval" count={pending.length}>
              {pending.length === 0 ? (
                <EmptyState icon={Clock} text="No companies waiting for approval." />
              ) : (
                <div className="flex flex-col gap-4">
                  {pending.map((c) => (
                    <CompanyRow key={c.id} company={c} onApprove={() => setStatus(c.id, 'approved')} onReject={() => setStatus(c.id, 'rejected')} />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Approved" count={approved.length}>
              {approved.length === 0 ? (
                <EmptyState icon={Building2} text="No approved companies yet." />
              ) : (
                <div className="flex flex-col gap-4">
                  {approved.map((c) => (
                    <CompanyRow key={c.id} company={c} onReject={() => setStatus(c.id, 'rejected')} />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Rejected" count={rejected.length}>
              {rejected.length === 0 ? (
                <EmptyState icon={X} text="No rejected companies." />
              ) : (
                <div className="flex flex-col gap-4">
                  {rejected.map((c) => (
                    <CompanyRow key={c.id} company={c} onApprove={() => setStatus(c.id, 'approved')} />
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </main>
    </div>
  )
}

function byCreatedAtDesc(a, b) {
  const at = a.createdAt?.seconds || 0
  const bt = b.createdAt?.seconds || 0
  return bt - at
}

function Section({ title, count, children }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-ink mb-4">
        {title} <span className="text-slate-light font-normal text-base">({count})</span>
      </h2>
      {children}
    </section>
  )
}

function CompanyRow({ company, onApprove, onReject }) {
  return (
    <div className="bg-white border border-line rounded-card shadow-card p-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-full bg-signal-light text-signal flex items-center justify-center font-display font-bold text-base flex-shrink-0">
          {company.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-ink truncate">{company.name || 'Untitled company'}</div>
          <div className="text-sm text-slate truncate">
            {company.contactName}
            {company.contactEmail && <span className="text-slate-light"> · {company.contactEmail}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onReject && (
          <button
            onClick={onReject}
            className="flex items-center gap-1.5 text-sm font-semibold text-coral px-4 py-2 rounded-full border border-coral-light hover:bg-coral-light transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} /> Reject
          </button>
        )}
        {onApprove && (
          <button
            onClick={onApprove}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-ink px-4 py-2 rounded-full hover:bg-ink/90 transition-colors"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Approve
          </button>
        )}
      </div>
    </div>
  )
}
