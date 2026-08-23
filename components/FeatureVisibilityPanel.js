'use client'

import { useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { saveErrorMessage } from '@/lib/firestoreErrors'

export default function FeatureVisibilityPanel({ companyId, library }) {
  const [error, setError] = useState('')

  async function setFlag(feature, role, value) {
    try {
      await setDoc(doc(db, 'companies', companyId, 'featureVisibility', feature.id), {
        name: feature.name,
        pm: feature.pm,
        client: feature.client,
        [role]: value,
      }, { merge: true })
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  return (
    <div className="bg-surface border border-line rounded-card shadow-card p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-1">Feature visibility</h2>
      <p className="text-sm text-slate mb-4">Show or hide features for PM and Client roles, company-wide. Admin always sees everything.</p>

      {error && (
        <div className="flex items-center gap-2 text-coral text-xs bg-coral-light border border-coral/20 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} /> {error}
        </div>
      )}

      <div className="space-y-1.5">
        {library.length === 0 && <p className="text-sm text-slate-light italic">No features configured yet.</p>}
        {library.map((feature) => (
          <div key={feature.id} className="flex items-center justify-between gap-3 text-sm border border-line rounded-lg px-3 py-2.5">
            <span className="font-medium text-ink truncate">{feature.name}</span>
            <div className="flex items-center gap-4 flex-shrink-0">
              <RoleToggle label="PM" value={feature.pm !== false} onChange={(v) => setFlag(feature, 'pm', v)} />
              <RoleToggle label="Client" value={feature.client !== false} onChange={(v) => setFlag(feature, 'client', v)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoleToggle({ label, value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-center gap-1.5 text-xs font-medium text-slate hover:text-ink">
      {value ? <ToggleRight className="w-7 h-7 text-signal" strokeWidth={1.5} /> : <ToggleLeft className="w-7 h-7 text-slate-light" strokeWidth={1.5} />}
      {label}
    </button>
  )
}
