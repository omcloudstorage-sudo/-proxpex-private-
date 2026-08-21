'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FolderKanban, Plus, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePmData } from '@/contexts/PmDataContext'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { resolveStatusKind } from '@/lib/statusLibrary'
import NewProjectForm from '@/components/NewProjectForm'
import EmptyState from '@/components/EmptyState'
import ProgressBar from '@/components/ProgressBar'

export default function PmPage() {
  const { profile } = useAuth()
  const { projects, clients } = usePmData()
  const { library } = useStatusLibrary(profile?.companyId, true)
  const [showForm, setShowForm] = useState(false)

  const clientMap = useMemo(() => Object.fromEntries((clients || []).map((c) => [c.id, c.name])), [clients])

  return (
    <div className="page-fade">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] leading-[1.2] font-bold text-ink tracking-tight">
            {profile?.name ? `Welcome back, ${profile.name.split(' ')[0]}` : 'Your projects'}
          </h1>
          <p className="text-slate text-lg mt-1">Projects assigned to you as project manager.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-signal text-white hover:bg-signal-dark flex-shrink-0"
        >
          {showForm ? 'Cancel' : (<><Plus className="w-3 h-3" strokeWidth={3} /> New project</>)}
        </button>
      </div>

      {showForm && profile && (
        <NewProjectForm profile={profile} clients={clients || []} fixedPmId={profile.id} clientMap={clientMap} onDone={() => setShowForm(false)} />
      )}

      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} text="No projects assigned to you yet — create one, or check with your company admin." />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="card-hover bg-surface/70 backdrop-blur border border-line rounded-card p-6 hover:shadow-card block"
            >
              <div className="font-display text-xl font-semibold text-ink mb-2">{p.name}</div>
              <div className="text-sm text-slate space-y-1 mb-4">
                <div className="flex items-center gap-1.5"><Building2 className="w-3 h-3" strokeWidth={2} /> <span className="font-medium">Client:</span> {clientMap[p.clientId] || '—'}</div>
              </div>
              <MiniProgress stages={p.stages || []} library={library} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniProgress({ stages, library }) {
  const total = stages.length || 1
  const done = stages.filter((s) => resolveStatusKind(s.status, library) === 'done').length
  const pct = Math.round((done / total) * 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="text-slate font-medium">{done}/{stages.length} stages done</span>
        <span className="text-progress font-bold">{pct}%</span>
      </div>
      <ProgressBar pct={pct} />
    </div>
  )
}
