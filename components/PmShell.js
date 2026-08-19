'use client'

import { FolderKanban, UserCog } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

const NAV = [
  { href: '/pm', label: 'Projects', icon: FolderKanban, exact: true },
  { href: '/pm/team', label: 'Team members', icon: UserCog },
]

export default function PmShell({ children }) {
  return <DashboardShell navItems={NAV}>{children}</DashboardShell>
}
