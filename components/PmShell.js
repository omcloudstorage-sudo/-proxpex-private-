'use client'

import { FolderKanban, UserCog, Users, Settings } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

const NAV = [
  { href: '/pm', label: 'Projects', icon: FolderKanban, exact: true },
  { href: '/pm/team', label: 'Team members', icon: UserCog },
  { href: '/pm/clients', label: 'Clients', icon: Users },
  { href: '/pm/settings', label: 'Settings', icon: Settings },
]

export default function PmShell({ children }) {
  return (
    <DashboardShell navItems={NAV} primaryAction={{ label: 'New Project', href: '/pm' }}>
      {children}
    </DashboardShell>
  )
}
