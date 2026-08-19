'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { FolderKanban, Briefcase, Users, CalendarClock, Plus, User, Building2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminData } from '@/contexts/AdminDataContext'
import { makeDefaultStages } from '@/lib/stages'
import { LabeledInput, LabeledSelect } from '@/components/FormFields'
import EmptyState from '@/components/EmptyState'
import ProgressBar from '@/components/ProgressBar'
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog'

export default function AdminProjectsPage() {
  const { profile } = useAuth()
  const { projects, pms, clients } = useAdminData()

  const dueThisWeek = useMemo(() => countStagesDueThisWeek(projects), [projects])

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

      <ProjectsTab projects={projects} pms={pms} clients={clients} profile={profile} />
    </div>
  )
}

function countStagesDueThisWeek(projects) {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const weekAhead = new Date(now)
  weekAhead.setDate(weekAhead.getDate() + 7)
  const weekAheadStr = weekAhead.toISOString().slice(0, 10)

  let count = 0
  for (const project of projects) {
    for (const stage of project.stages || []) {
      if (stage.status === 'done' || !stage.dueDate) continue
      if (stage.dueDate >= todayStr && stage.dueDate <= weekAheadStr) count += 1
    }
  }
  return count
}

function StatCard({ icon: Icon, label, value, tone = 'signal' }) {
  const toneCls = tone === 'signal' ? 'bg-signal-light text-signal' : 'bg-paper text-slate'
  return (
    <div className="bg-white border border-line rounded-card shadow-card p-6 flex flex-col justify-between h-[160px]">
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

function ProjectsTab({ projects, pms, clients, profile }) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [pmId, setPmId] = useState('')
  const [clientId, setClientId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pmMap = useMemo(() => Object.fromEntries(pms.map((p) => [p.id, p.name])), [pms])
  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.name])), [clients])

  async function createProject(e) {
    e.preventDefault()
    setError('')
    if (!name || !pmId || !clientId) {
      setError('Please fill in project name, PM, and client.')
      return
    }
    setBusy(true)
    try {
      const ref = await addDoc(collection(db, 'projects'), {
        companyId: profile.companyId,
        name,
        pmId,
        clientId,
        stages: makeDefaultStages(),
        createdAt: serverTimestamp(),
      })
      await logAction(
        ref.id,
        { uid: profile.id, name: profile.name, role: profile.role },
        AUDIT_ACTIONS.PROJECT_CREATED,
        `Project created — PM: ${pmMap[pmId] || '—'}, Client: ${clientMap[clientId] || '—'} assigned`
      )
      setName('')
      setPmId('')
      setClientId('')
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-ink">Projects</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/90"
        >
          {showForm ? 'Cancel' : (<><Plus className="w-3 h-3" strokeWidth={3} /> New project</>)}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createProject} className="bg-white border border-line rounded-card shadow-card p-6 mb-6 grid md:grid-cols-4 gap-3 items-end">
          <LabeledInput label="Project name" value={name} onChange={setName} />
          <LabeledSelect label="Project manager" value={pmId} onChange={setPmId} options={pms} empty="No PMs yet" />
          <LabeledSelect label="Client" value={clientId} onChange={setClientId} options={clients} empty="No clients yet" />
          <button
            type="submit"
            disabled={busy}
            className="text-sm font-medium px-4 py-2.5 rounded-lg bg-signal text-white hover:bg-signal-dark disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create project'}
          </button>
          {error && <p className="text-coral text-xs md:col-span-4">{error}</p>}
        </form>
      )}

      {projects.length === 0 ? (
        <EmptyState text="No projects yet. Add a project manager and a client first, then create a project." />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="bg-white/70 backdrop-blur border border-black/5 rounded-card p-6 hover:shadow-card transition-shadow block"
            >
              <div className="font-display text-xl font-semibold text-ink mb-2">{p.name}</div>
              <div className="text-sm text-slate space-y-1 mb-4">
                <div className="flex items-center gap-1.5"><User className="w-[13px] h-[13px]" strokeWidth={2} /> <span className="font-medium">PM:</span> {pmMap[p.pmId] || '—'}</div>
                <div className="flex items-center gap-1.5"><Building2 className="w-3 h-3" strokeWidth={2} /> <span className="font-medium">Client:</span> {clientMap[p.clientId] || '—'}</div>
              </div>
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
