'use client'

import Link from 'next/link'
import { FolderKanban } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePmData } from '@/contexts/PmDataContext'
import EmptyState from '@/components/EmptyState'
import ProgressBar from '@/components/ProgressBar'

export default function PmPage() {
  const { profile } = useAuth()
  const { projects } = usePmData()

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-[36px] leading-[1.2] font-bold text-ink tracking-tight">
          {profile?.name ? `Welcome back, ${profile.name.split(' ')[0]}` : 'Your projects'}
        </h1>
        <p className="text-slate text-lg mt-1">Projects assigned to you as project manager.</p>
      </div>

      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} text="No projects assigned to you yet — check with your company admin." />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="bg-white/70 backdrop-blur border border-black/5 rounded-card p-6 hover:shadow-card transition-shadow block"
            >
              <div className="font-display text-xl font-semibold text-ink mb-4">{p.name}</div>
              <MiniProgress stages={p.stages || []} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniProgress({ stages }) {
  const total = stages.length || 1
  const done = stages.filter((s) => s.status === 'done').length
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
