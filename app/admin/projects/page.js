'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { User, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminData } from '@/contexts/AdminDataContext'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { resolveStatusKind } from '@/lib/statusLibrary'
import EmptyState from '@/components/EmptyState'
import ProgressBar from '@/components/ProgressBar'

export default function AdminProjectsListPage() {
  const { profile } = useAuth()
  const { projects, pms, clients } = useAdminData()
  const { library } = useStatusLibrary(profile?.companyId, true)

  const pmMap = useMemo(() => Object.fromEntries(pms.map((p) => [p.id, p.name])), [pms])
  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.name])), [clients])

  return (
    <div className="page-fade">
      <div className="mb-8">
        <h1 className="font-display text-[36px] leading-[1.2] font-bold text-ink tracking-tight">Projects</h1>
        <p className="text-slate text-lg mt-1">Every project across your company&rsquo;s workspace.</p>
      </div>

      {projects.length === 0 ? (
        <EmptyState text="No projects yet. Add a project manager and a client first, then create a project from the sidebar." />
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
                <div className="flex items-center gap-1.5"><User className="w-[13px] h-[13px]" strokeWidth={2} /> <span className="font-medium">PM:</span> {pmMap[p.pmId] || '—'}</div>
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
