'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { usePriorityLibrary } from '@/lib/usePriorityLibrary'
import { useRoadmapTemplates, useResourceTemplates } from '@/lib/useTemplates'
import StatusLibraryPanel from '@/components/StatusLibraryPanel'
import PriorityLibraryPanel from '@/components/PriorityLibraryPanel'
import RoadmapTemplatesPanel from '@/components/RoadmapTemplatesPanel'
import ResourceTemplatesPanel from '@/components/ResourceTemplatesPanel'
import AppearanceControls from '@/components/AppearanceControls'

export default function PmSettingsPage() {
  const { profile, company } = useAuth()
  const { library } = useStatusLibrary(profile?.companyId, true)
  const { library: priorityLibrary } = usePriorityLibrary(profile?.companyId, true)
  const { templates: roadmapTemplates } = useRoadmapTemplates(profile?.companyId)
  const { templates: resourceTemplates } = useResourceTemplates(profile?.companyId)

  return (
    <div className="page-fade">
      <div className="mb-8">
        <h1 className="font-display text-[30px] leading-[1.2] font-bold text-ink tracking-tight">Settings</h1>
        <p className="text-slate text-base mt-1">
          Company-wide statuses, priorities, and templates — shared with every Admin and PM at {company?.name || 'your company'}.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-2xl">
        <div className="bg-surface border border-line rounded-card shadow-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Your account</h2>
          <div className="text-base font-semibold text-ink">{profile?.name}</div>
          <div className="text-sm text-slate mt-0.5">{profile?.email}</div>
        </div>

        <div className="bg-surface border border-line rounded-card shadow-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Appearance</h2>
          <AppearanceControls />
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
