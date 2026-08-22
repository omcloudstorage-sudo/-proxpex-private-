'use client'

import { FolderKanban, Briefcase, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminData } from '@/contexts/AdminDataContext'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { usePriorityLibrary } from '@/lib/usePriorityLibrary'
import { useRoadmapTemplates, useResourceTemplates } from '@/lib/useTemplates'
import StatusLibraryPanel from '@/components/StatusLibraryPanel'
import PriorityLibraryPanel from '@/components/PriorityLibraryPanel'
import RoadmapTemplatesPanel from '@/components/RoadmapTemplatesPanel'
import ResourceTemplatesPanel from '@/components/ResourceTemplatesPanel'
import AppearanceControls from '@/components/AppearanceControls'
import RexPreferencesControls from '@/components/RexPreferencesControls'

export default function AdminSettingsPage() {
  const { profile } = useAuth()
  const { companyName, projects, pms, clients } = useAdminData()
  const { library } = useStatusLibrary(profile?.companyId, true)
  const { library: priorityLibrary } = usePriorityLibrary(profile?.companyId, true)
  const { templates: roadmapTemplates } = useRoadmapTemplates(profile?.companyId)
  const { templates: resourceTemplates } = useResourceTemplates(profile?.companyId)

  return (
    <div className="page-fade">
      <div className="mb-8">
        <h1 className="font-display text-[30px] leading-[1.2] font-bold text-ink tracking-tight">Settings</h1>
        <p className="text-slate text-base mt-1">Your company, account, and the shared configuration every project draws from.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-surface border border-line rounded-card shadow-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Company</h2>
          <div className="font-display text-lg font-semibold text-ink mb-4">{companyName || '—'}</div>
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={FolderKanban} label="Projects" value={projects.length} />
            <Stat icon={Briefcase} label="Project managers" value={pms.length} />
            <Stat icon={Users} label="Clients" value={clients.length} />
          </div>
        </div>

        <div className="bg-surface border border-line rounded-card shadow-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Your account</h2>
          <div className="text-base font-semibold text-ink">{profile?.name}</div>
          <div className="text-sm text-slate mt-0.5">{profile?.email}</div>
        </div>

        <div className="bg-surface border border-line rounded-card shadow-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Appearance</h2>
          <AppearanceControls />
          <div className="mt-5 pt-5 border-t border-line/70">
            <RexPreferencesControls />
          </div>
        </div>
      </div>

      {profile?.companyId && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <StatusLibraryPanel companyId={profile.companyId} library={library} />
            <PriorityLibraryPanel companyId={profile.companyId} library={priorityLibrary} />
          </div>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <RoadmapTemplatesPanel companyId={profile.companyId} templates={roadmapTemplates} library={library} />
            <ResourceTemplatesPanel companyId={profile.companyId} templates={resourceTemplates} />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="border border-line rounded-lg px-3 py-3">
      <Icon className="w-4 h-4 text-slate-light mb-2" strokeWidth={1.75} />
      <div className="font-display text-xl font-semibold leading-none mb-1 text-ink">{value}</div>
      <div className="text-[11px] text-slate-light">{label}</div>
    </div>
  )
}
