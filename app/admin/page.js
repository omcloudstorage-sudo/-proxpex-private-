'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FolderKanban, Briefcase, Users, CalendarClock, Plus, User, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminData } from '@/contexts/AdminDataContext'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { resolveStatusKind } from '@/lib/statusLibrary'
import NewProjectForm from '@/components/NewProjectForm'
import EmptyState from '@/components/EmptyState'
import ProgressBar from '@/components/ProgressBar'
import ClientGlobe from '@/components/ClientGlobe'
import { findCountry } from '@/lib/countries'

export default function AdminProjectsPage() {
  const { profile } = useAuth()
  const { projects, pms, clients } = useAdminData()
  const { library } = useStatusLibrary(profile?.companyId, true)

  const dueThisWeek = useMemo(() => countStagesDueThisWeek(projects, library), [projects, library])
  const countryMarkers = useMemo(() => countClientCountries(projects), [projects])

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-[36px] leading-[1.2] font-bold text-ink tracking-tight">
          {profile?.name ? `Welcome back, ${profile.name.split(' ')[0]}` : 'Projects'}
        </h1>
        <p className="text-slate text-lg mt-1">Here&rsquo;s a real-time overview of your company&rsquo;s workspace.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <StatCard icon={FolderKanban} label="Projects" value={projects.length} tone="signal" />
        <StatCard icon={Briefcase} label="Project managers" value={pms.length} tone="signal" />
        <StatCard icon={Users} label="Clients" value={clients.length} tone="signal" />
        <StatCard icon={CalendarClock} label="Due this week" value={dueThisWeek} tone="neutral" />
      </div>

      <ClientGlobe markers={countryMarkers} />

      <ProjectsTab projects={projects} pms={pms} clients={clients} profile={profile} library={library} />
    </div>
  )
}

function countStagesDueThisWeek(projects, library) {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const weekAhead = new Date(now)
  weekAhead.setDate(weekAhead.getDate() + 7)
  const weekAheadStr = weekAhead.toISOString().slice(0, 10)

  let count = 0
  for (const project of projects) {
    for (const stage of project.stages || []) {
      if (resolveStatusKind(stage.status, library) === 'done' || !stage.dueDate) continue
      if (stage.dueDate >= todayStr && stage.dueDate <= weekAheadStr) count += 1
    }
  }
  return count
}

// One marker per unique country with >= 1 client project — count is the
// number of projects in that country (shown in ClientGlobe's legend).
function countClientCountries(projects) {
  const counts = {}
  for (const p of projects) {
    if (!p.country) continue
    counts[p.country] = (counts[p.country] || 0) + 1
  }
  return Object.entries(counts)
    .map(([code, count]) => {
      const c = findCountry(code)
      return c ? { id: code, name: c.name, lat: c.lat, lng: c.lng, count } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)
}

function StatCard({ icon: Icon, label, value, tone = 'signal' }) {
  const toneCls = tone === 'signal' ? 'bg-signal-light text-signal' : 'bg-paper text-slate'
  return (
    <div className="bg-surface border border-line rounded-card shadow-card p-6 flex flex-col justify-between h-[160px]">
      <div className={`w-12 h-9 rounded-lg flex items-center justify-center ${toneCls}`}>
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
      </div>
      <div>
        <div className="font-display text-[28px] leading-none font-semibold tracking-tight text-ink mb-1">{value}</div>
        <div className="text-xs font-medium text-slate uppercase tracking-wide">{label}</div>
      </div>
    </div>
  )
}

function ProjectsTab({ projects, pms, clients, profile, library }) {
  const [showForm, setShowForm] = useState(false)

  const pmMap = useMemo(() => Object.fromEntries(pms.map((p) => [p.id, p.name])), [pms])
  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.name])), [clients])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-ink">Projects</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-signal text-white hover:bg-signal-dark"
        >
          {showForm ? 'Cancel' : (<><Plus className="w-3 h-3" strokeWidth={3} /> New project</>)}
        </button>
      </div>

      {showForm && (
        <NewProjectForm profile={profile} pms={pms} clients={clients} pmMap={pmMap} clientMap={clientMap} onDone={() => setShowForm(false)} />
      )}

      {projects.length === 0 ? (
        <EmptyState text="No projects yet. Add a project manager and a client first, then create a project." />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="bg-surface/70 backdrop-blur border border-line rounded-card p-6 hover:shadow-card transition-shadow block"
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
