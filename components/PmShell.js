'use client'

import { useMemo, useState } from 'react'
import { FolderKanban, UserCog, Users, Settings } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'
import NewProjectForm from '@/components/NewProjectForm'
import { useAuth } from '@/contexts/AuthContext'
import { usePmData } from '@/contexts/PmDataContext'

const NAV = [
  { href: '/pm', label: 'Projects', icon: FolderKanban, exact: true },
  { href: '/pm/team', label: 'Team members', icon: UserCog },
  { href: '/pm/clients', label: 'Clients', icon: Users },
  { href: '/pm/settings', label: 'Settings', icon: Settings },
]

// The sidebar's "New Project" button is the one and only entry point for
// project creation — it owns the modal so it works identically from every
// PM page instead of each page wiring its own inline form.
export default function PmShell({ children }) {
  const { profile } = useAuth()
  const { clients } = usePmData()
  const [modalOpen, setModalOpen] = useState(false)

  const clientMap = useMemo(() => Object.fromEntries((clients || []).map((c) => [c.id, c.name])), [clients])

  return (
    <>
      <DashboardShell navItems={NAV} primaryAction={{ label: 'New Project', onClick: () => setModalOpen(true) }}>
        {children}
      </DashboardShell>
      {profile && (
        <NewProjectForm
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          profile={profile}
          clients={clients || []}
          fixedPmId={profile.id}
          clientMap={clientMap}
        />
      )}
    </>
  )
}
