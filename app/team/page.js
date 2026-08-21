'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { FolderKanban } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import RequireRole from '@/components/RequireRole'
import CompanyStatusGate from '@/components/CompanyStatusGate'
import TopNav from '@/components/TopNav'
import RoadmapTimeline from '@/components/RoadmapTimeline'
import EmptyState from '@/components/EmptyState'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { resolveStatusKind, STATUS_KINDS } from '@/lib/statusLibrary'

export default function TeamPage() {
  return (
    <RequireRole role="team_member">
      <CompanyStatusGate>
        <TeamDashboard />
      </CompanyStatusGate>
    </RequireRole>
  )
}

function TeamDashboard() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState([])
  const { library } = useStatusLibrary(profile?.companyId, false)

  useEffect(() => {
    if (!profile?.pmId) return
    const unsub = onSnapshot(
      query(collection(db, 'projects'), where('pmId', '==', profile.pmId)),
      (snap) => setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [profile])

  return (
    <div className="min-h-screen page-fade">
      <TopNav />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="font-display text-2xl font-semibold mb-1">
          {profile?.name ? `Welcome back, ${profile.name.split(' ')[0]}` : 'Your team’s projects'}
        </h1>
        <p className="text-slate text-sm mb-6">Projects from the PM who added you — post updates, view status and docs.</p>

        {projects.length === 0 ? (
          <EmptyState icon={FolderKanban} text="No projects to show yet — check with your project manager." />
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <TeamProjectCard key={p.id} project={p} library={library} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function TeamProjectCard({ project, library }) {
  const stages = project.stages || []
  const done = stages.filter((s) => resolveStatusKind(s.status, library) === STATUS_KINDS.DONE).length
  const current = stages.find((s) => resolveStatusKind(s.status, library) === STATUS_KINDS.IN_PROGRESS)

  return (
    <Link
      href={`/project/${project.id}`}
      className="card-hover card-pop block bg-surface rounded-card shadow-card p-6"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-signal-light flex items-center justify-center flex-shrink-0 font-display font-semibold text-signal">
            {project.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold text-lg truncate">{project.name}</div>
            <div className="text-xs text-slate-light font-mono">{done}/{stages.length} stages done</div>
          </div>
        </div>
        {current && (
          <span className="flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-signal-light text-signal">
            {current.name}
          </span>
        )}
      </div>

      <RoadmapTimeline stages={stages} library={library} />
    </Link>
  )
}
