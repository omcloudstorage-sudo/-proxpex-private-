'use client'

import { FolderKanban, Briefcase, Users, UserCog, Settings } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

const NAV = [
  { href: '/admin', label: 'Projects', icon: FolderKanban, exact: true },
  { href: '/admin/pms', label: 'Project managers', icon: Briefcase },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/team', label: 'Team members', icon: UserCog },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminShell({ children }) {
  return (
    <DashboardShell navItems={NAV} primaryAction={{ label: 'New Project', href: '/admin' }}>
      {children}
    </DashboardShell>
  )
}
