'use client'

import { useMemo, useState } from 'react'
import { LayoutDashboard, FolderKanban, Users, UsersRound, Settings } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'
import NewProjectForm from '@/components/NewProjectForm'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminData } from '@/contexts/AdminDataContext'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/team', label: 'Team Management', icon: UsersRound },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

// The sidebar's "New Project" button is the one and only entry point for
// project creation — it owns the modal so it works identically from every
// Admin page instead of each page wiring its own inline form.
export default function AdminShell({ children }) {
  const { profile } = useAuth()
  const { pms, clients } = useAdminData()
  const [modalOpen, setModalOpen] = useState(false)

  const pmMap = useMemo(() => Object.fromEntries(pms.map((p) => [p.id, p.name])), [pms])
  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.name])), [clients])

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
          pms={pms}
          clients={clients}
          pmMap={pmMap}
          clientMap={clientMap}
        />
      )}
    </>
  )
}
