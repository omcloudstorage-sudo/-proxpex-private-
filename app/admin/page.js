'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FolderKanban, Briefcase, Users, CalendarClock, DollarSign, Plus, User, Building2, MapPin, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminData } from '@/contexts/AdminDataContext'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { resolveStatusKind } from '@/lib/statusLibrary'
import { formatCurrency, INVOICE_STATUS } from '@/lib/invoices'
import { useCountUp } from '@/lib/useCountUp'
import NewProjectForm from '@/components/NewProjectForm'
import EmptyState from '@/components/EmptyState'
import ProgressBar from '@/components/ProgressBar'
import ClientGlobe from '@/components/ClientGlobe'
import { findCountry } from '@/lib/countries'

export default function AdminProjectsPage() {
  const { profile } = useAuth()
  const { projects, pms, clients } = useAdminData()
  const { library } = useStatusLibrary(profile?.companyId, true)
  const [selectedClientId, setSelectedClientId] = useState(null)

  const dueThisWeek = useMemo(() => countStagesDueThisWeek(projects, library), [projects, library])
  const countryMarkers = useMemo(() => countClientCountries(projects), [projects])
  const revenue = useMemo(() => sumRevenue(projects), [projects])
  const pmMap = useMemo(() => Object.fromEntries(pms.map((p) => [p.id, p.name])), [pms])

  const clientsWithMeta = useMemo(
    () => buildClientMeta(clients, projects, pmMap, library),
    [clients, projects, pmMap, library]
  )
  const selectedClient = clientsWithMeta.find((c) => c.id === selectedClientId) || null

  const stats = [
    { icon: FolderKanban, label: 'Projects', value: projects.length, tone: 'signal' },
    { icon: Briefcase, label: 'Project managers', value: pms.length, tone: 'signal' },
    { icon: Users, label: 'Clients', value: clients.length, tone: 'signal' },
    { icon: CalendarClock, label: 'Due this week', value: dueThisWeek, tone: 'neutral' },
    {
      icon: DollarSign,
      label: 'Revenue collected',
      value: revenue.paid,
      format: formatCurrency,
      sub: revenue.billed > revenue.paid ? `${formatCurrency(revenue.billed - revenue.paid)} outstanding` : null,
      tone: 'signal',
    },
  ]

  return (
    <div className="page-fade">
      <div className="mb-6">
        <h1 className="font-display text-[36px] leading-[1.2] font-bold text-ink tracking-tight">
          {profile?.name ? `Welcome back, ${profile.name.split(' ')[0]}` : 'Projects'}
        </h1>
        <p className="text-slate text-lg mt-1">Here&rsquo;s a real-time overview of your company&rsquo;s workspace.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 60} />
        ))}
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 mb-10">
        <ClientListCard
          clients={clientsWithMeta}
          selectedId={selectedClientId}
          onSelect={(id) => setSelectedClientId((cur) => (cur === id ? null : id))}
        />

        <div className="bg-[rgb(12,19,36)] border border-line rounded-card shadow-card p-6 md:p-8">
          <ClientGlobe markers={countryMarkers} focusedId={selectedClient?.countryCode || null} />

          <div className="mt-6 pt-6 border-t border-white/10">
            {selectedClient ? (
              <ClientDetail client={selectedClient} onClose={() => setSelectedClientId(null)} />
            ) : (
              <>
                <div className="text-xs font-medium text-slate-300 uppercase tracking-wide mb-3">Client locations</div>
                {countryMarkers.length === 0 ? (
                  <p className="text-sm text-slate-400">No client countries recorded yet — set a country on a project to see it here.</p>
                ) : (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                    {countryMarkers.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 text-sm text-slate-300">
                        <span className="truncate">{m.name}</span>
                        <span className="text-white font-medium flex-shrink-0">{m.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ProjectsTab projects={projects} pms={pms} clients={clients} profile={profile} library={library} />
    </div>
  )
}

function countStagesDueThisWeek(projects, library) {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const weekAhead = new Date(now)
  weekAhead.setDate(weekAhead.getDate() + 7)
  const weekAheadStr = weekAhead.toISOString().slice(0, 10)

  let count = 0
  for (const project of projects) {
    for (const stage of project.stages || []) {
      if (resolveStatusKind(stage.status, library) === 'done' || !stage.dueDate) continue
      if (stage.dueDate >= todayStr && stage.dueDate <= weekAheadStr) count += 1
    }
  }
  return count
}

// One marker per unique country with >= 1 client project — count is the
// number of projects in that country (shown in the globe card's legend).
function countClientCountries(projects) {
  const counts = {}
  for (const p of projects) {
    if (!p.country) continue
    counts[p.country] = (counts[p.country] || 0) + 1
  }
  return Object.entries(counts)
    .map(([code, count]) => {
      const c = findCountry(code)
      return c ? { id: code, name: c.name, lat: c.lat, lng: c.lng, count } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)
}

// Pairs each client user with the projects billed to them, so the sidebar
// list and the detail panel can show project count / country / status
// without either owning a duplicate copy of "country" (that field lives on
// the project, not the client user record).
function buildClientMeta(clients, projects, pmMap, library) {
  return clients
    .map((c) => {
      const clientProjects = projects.filter((p) => p.clientId === c.id)
      const countryCode = clientProjects.find((p) => p.country)?.country || null
      const country = countryCode ? findCountry(countryCode) : null
      return {
        ...c,
        projects: clientProjects.map((p) => ({
          ...p,
          pmName: pmMap[p.pmId] || '—',
          pct: stagePct(p.stages, library),
        })),
        countryCode,
        countryName: country?.name || null,
      }
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

function stagePct(stages, library) {
  const list = stages || []
  const total = list.length || 1
  const done = list.filter((s) => resolveStatusKind(s.status, library) === 'done').length
  return Math.round((done / total) * 100)
}

function StatCard({ icon: Icon, label, value, format, sub, tone = 'signal', delay = 0 }) {
  const animated = useCountUp(value)
  const display = format ? format(Math.round(animated)) : Math.round(animated).toLocaleString()
  const toneCls = tone === 'signal' ? 'bg-signal-light text-signal' : 'bg-paper text-slate'
  return (
    <div
      className="stat-pop bg-surface border border-line rounded-card shadow-card p-4 flex items-center gap-3 h-[92px]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${toneCls}`}>
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <div className="font-display text-xl leading-none font-semibold tracking-tight text-ink mb-1 truncate">{display}</div>
        <div className="text-[11px] font-medium text-slate uppercase tracking-wide truncate">{label}</div>
        {sub && <div className="text-[11px] text-amber font-medium mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  )
}

// Rolls up every invoice across every stage of every project — company-wide
// billed vs. paid, not scoped to a single project like InvoicesPanel's total.
// Invoicing UI is hidden elsewhere for now, but this rollup number still
// reflects real billing data recorded before the pause.
function sumRevenue(projects) {
  let billed = 0
  let paid = 0
  for (const project of projects) {
    for (const stage of project.stages || []) {
      for (const invoice of stage.invoices || []) {
        const amount = Number(invoice.amount) || 0
        billed += amount
        if (invoice.status === INVOICE_STATUS.PAID) paid += amount
      }
    }
  }
  return { billed, paid }
}

function ClientListCard({ clients, selectedId, onSelect }) {
  return (
    <div className="bg-surface border border-line rounded-card shadow-card p-5 flex flex-col max-h-[520px]">
      <div className="text-xs font-medium text-slate uppercase tracking-wide mb-3 flex-shrink-0">Clients</div>
      {clients.length === 0 ? (
        <p className="text-sm text-slate-light">No clients yet.</p>
      ) : (
        <ul className="space-y-1 overflow-y-auto -mr-2 pr-2">
          {clients.map((c) => {
            const active = c.id === selectedId
            return (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c.id)}
                  className={[
                    'w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2',
                    active ? 'bg-signal-light text-signal' : 'hover:bg-paper text-ink',
                  ].join(' ')}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{c.name}</span>
                    <span className={`block text-[11px] truncate ${active ? 'text-signal/80' : 'text-slate-light'}`}>
                      {c.countryName || 'No country set'}
                    </span>
                  </span>
                  <span
                    className={[
                      'text-[11px] font-semibold flex-shrink-0 px-1.5 py-0.5 rounded-full',
                      active ? 'bg-signal/15 text-signal' : 'bg-paper text-slate',
                    ].join(' ')}
                  >
                    {c.projects.length}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ClientDetail({ client, onClose }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-display text-lg font-semibold text-white">{client.name}</div>
          <div className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3 h-3" strokeWidth={2} />
            {client.countryName || 'No country set'}
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white flex-shrink-0" title="Close">
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {client.projects.length === 0 ? (
        <p className="text-sm text-slate-400">No projects for this client yet.</p>
      ) : (
        <div className="space-y-2">
          {client.projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-3 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-sm font-medium text-white truncate">{p.name}</span>
                <span className="text-xs font-bold text-signal flex-shrink-0">{p.pct}%</span>
              </div>
              <div className="text-xs text-slate-400 mb-2">PM: {p.pmName}</div>
              <ProgressBar pct={p.pct} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectsTab({ projects, pms, clients, profile, library }) {
  const [showForm, setShowForm] = useState(false)

  const pmMap = useMemo(() => Object.fromEntries(pms.map((p) => [p.id, p.name])), [pms])
  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.name])), [clients])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-ink">Projects</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-signal text-white hover:bg-signal-dark"
        >
          {showForm ? 'Cancel' : (<><Plus className="w-3 h-3" strokeWidth={3} /> New project</>)}
        </button>
      </div>

      {showForm && (
        <NewProjectForm profile={profile} pms={pms} clients={clients} pmMap={pmMap} clientMap={clientMap} onDone={() => setShowForm(false)} />
      )}

      {projects.length === 0 ? (
        <EmptyState text="No projects yet. Add a project manager and a client first, then create a project." />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="card-hover bg-surface/70 backdrop-blur border border-line rounded-card p-6 hover:shadow-card block"
            >
              <div className="font-display text-xl font-semibold text-ink mb-2">{p.name}</div>
              <div className="text-sm text-slate space-y-1 mb-4">
                <div className="flex items-center gap-1.5"><User className="w-[13px] h-[13px]" strokeWidth={2} /> <span className="font-medium">PM:</span> {pmMap[p.pmId] || '—'}</div>
                <div className="flex items-center gap-1.5"><Building2 className="w-3 h-3" strokeWidth={2} /> <span className="font-medium">Client:</span> {clientMap[p.clientId] || '—'}</div>
              </div>
              <MiniProgress stages={p.stages || []} library={library} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniProgress({ stages, library }) {
  const total = stages.length || 1
  const done = stages.filter((s) => resolveStatusKind(s.status, library) === 'done').length
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
