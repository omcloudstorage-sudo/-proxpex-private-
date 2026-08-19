'use client'

import { FolderKanban, Briefcase, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminData } from '@/contexts/AdminDataContext'

export default function AdminSettingsPage() {
  const { profile } = useAuth()
  const { companyName, projects, pms, clients } = useAdminData()

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold mb-1">Settings</h1>
      <p className="text-slate text-sm mb-6">Your company and account details.</p>

      <div className="bg-white rounded-card shadow-card p-6 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Company</h2>
        <div className="font-display text-lg font-semibold mb-4">{companyName || '—'}</div>
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={FolderKanban} label="Projects" value={projects.length} />
          <Stat icon={Briefcase} label="Project managers" value={pms.length} />
          <Stat icon={Users} label="Clients" value={clients.length} />
        </div>
      </div>

      <div className="bg-white rounded-card shadow-card p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Your account</h2>
        <div className="text-sm font-medium">{profile?.name}</div>
        <div className="text-sm text-slate">{profile?.email}</div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="border border-line rounded-lg px-3 py-3">
      <Icon className="w-4 h-4 text-slate-light mb-2" strokeWidth={1.75} />
      <div className="font-display text-xl font-semibold leading-none mb-1">{value}</div>
      <div className="text-[11px] text-slate-light">{label}</div>
    </div>
  )
}
