'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FolderKanban, Briefcase, Users, CalendarClock, DollarSign, ChevronRight, MapPin, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminData } from '@/contexts/AdminDataContext'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { resolveStatusKind } from '@/lib/statusLibrary'
import { formatCurrency, INVOICE_STATUS } from '@/lib/invoices'
import { useCountUp } from '@/lib/useCountUp'
import ClientGlobe from '@/components/ClientGlobe'
import { findCountry } from '@/lib/countries'

export default function AdminProjectsPage() {
  const { profile } = useAuth()
  const { projects, pms, clients } = useAdminData()
  const { library } = useStatusLibrary(profile?.companyId, true)
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [focusedProjectId, setFocusedProjectId] = useState(null)

  const dueThisWeek = useMemo(() => countStagesDueThisWeek(projects, library), [projects, library])
  const countryMarkers = useMemo(() => countClientCountries(projects), [projects])
  const revenue = useMemo(() => sumRevenue(projects), [projects])
  const pmMap = useMemo(() => Object.fromEntries(pms.map((p) => [p.id, p.name])), [pms])

  const clientsWithMeta = useMemo(
    () => buildClientMeta(clients, projects, pmMap, library),
    [clients, projects, pmMap, library]
  )
  const selectedClient = clientsWithMeta.find((c) => c.id === selectedClientId) || null
  const focusedProject = selectedClient?.projects.find((p) => p.id === focusedProjectId) || null

  function selectClient(id) {
    if (id === selectedClientId) {
      setSelectedClientId(null)
      setFocusedProjectId(null)
      return
    }
    const client = clientsWithMeta.find((c) => c.id === id)
    setSelectedClientId(id)
    setFocusedProjectId(client?.projects[0]?.id || null)
  }

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
          {profile?.name ? `Welcome back, ${profile.name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-slate text-lg mt-1">Here&rsquo;s a real-time overview of your company&rsquo;s workspace.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 60} />
        ))}
      </div>

      <div className="bg-[rgb(12,19,36)] border border-line rounded-card shadow-card overflow-hidden mb-10 grid lg:grid-cols-[280px_1fr]">
        <ClientListCard
          clients={clientsWithMeta}
          selectedId={selectedClientId}
          focusedProjectId={focusedProjectId}
          onSelectClient={selectClient}
          onSelectProject={setFocusedProjectId}
        />

        <div className="p-6 md:p-8 border-t lg:border-t-0 border-white/10">
          <ClientGlobe
            markers={countryMarkers}
            focusedId={focusedProject?.countryCode || null}
            focusedLabel={focusedProject ? `${focusedProject.name} · ${focusedProject.pct}%` : null}
          />

          <div className="mt-6 pt-6 border-t border-white/10">
            {selectedClient ? (
              <ClientDetail client={selectedClient} focusedProjectId={focusedProjectId} onClose={() => selectClient(selectedClient.id)} />
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

// Pairs each client user with the projects billed to them, keeping each
// project's own country — a client with projects in different countries
// has multiple distinct "locations", each individually selectable in the
// sidebar sub-list rather than collapsed into a single country per client.
function buildClientMeta(clients, projects, pmMap, library) {
  return clients
    .map((c) => {
      const clientProjects = projects
        .filter((p) => p.clientId === c.id)
        .map((p) => {
          const country = p.country ? findCountry(p.country) : null
          return {
            ...p,
            pmName: pmMap[p.pmId] || '—',
            pct: stagePct(p.stages, library),
            countryCode: p.country || null,
            countryName: country?.name || null,
          }
        })
      const distinctCountries = new Set(clientProjects.map((p) => p.countryCode).filter(Boolean))
      const firstWithCountry = clientProjects.find((p) => p.countryCode)
      return {
        ...c,
        projects: clientProjects,
        countryCode: firstWithCountry?.countryCode || null,
        countryName: firstWithCountry?.countryName || null,
        locationCount: distinctCountries.size,
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

// Each client row expands (accordion-style, one at a time) to list their
// individual projects as clickable sub-items — the way to reach a specific
// project's location on the globe when a client has more than one.
function ClientListCard({ clients, selectedId, focusedProjectId, onSelectClient, onSelectProject }) {
  return (
    <div className="p-5">
      <div className="text-xs font-medium text-slate-300 uppercase tracking-wide mb-3">Clients</div>
      {clients.length === 0 ? (
        <p className="text-sm text-slate-400">No clients yet.</p>
      ) : (
        <ul className="space-y-1">
          {clients.map((c) => {
            const active = c.id === selectedId
            return (
              <li key={c.id}>
                <button
                  onClick={() => onSelectClient(c.id)}
                  className={[
                    'w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2',
                    active ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-slate-200',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex items-center gap-2">
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform ${active ? 'rotate-90' : ''}`} strokeWidth={2} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{c.name}</span>
                      <span className={`block text-[11px] truncate ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                        {c.projects.length} project{c.projects.length === 1 ? '' : 's'}
                        {c.locationCount > 1 ? ` · ${c.locationCount} locations` : c.countryName ? ` · ${c.countryName}` : ''}
                      </span>
                    </span>
                  </span>
                  <span
                    className={[
                      'text-[11px] font-semibold flex-shrink-0 px-1.5 py-0.5 rounded-full',
                      active ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-300',
                    ].join(' ')}
                  >
                    {c.projects.length}
                  </span>
                </button>

                {active && c.projects.length > 0 && (
                  <ul className="ml-[1.4rem] mt-1 mb-1 space-y-0.5 border-l border-white/10 pl-3">
                    {c.projects.map((p) => {
                      const isFocused = p.id === focusedProjectId
                      return (
                        <li key={p.id}>
                          <button
                            onClick={() => onSelectProject(p.id)}
                            className={[
                              'w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors',
                              isFocused ? 'bg-signal/20 text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5',
                            ].join(' ')}
                          >
                            <MapPin className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                            <span className="truncate flex-1">{p.name}</span>
                            <span className="text-slate-500 flex-shrink-0">{p.countryName || 'No country'}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ClientDetail({ client, focusedProjectId, onClose }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-display text-lg font-semibold text-white">{client.name}</div>
          <div className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3 h-3" strokeWidth={2} />
            {client.locationCount > 1 ? `${client.locationCount} locations` : client.countryName || 'No country set'}
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
              title={`Open ${p.name}`}
              className={[
                'group flex items-center justify-between gap-3 border rounded-lg px-4 py-3 transition-colors cursor-pointer',
                p.id === focusedProjectId ? 'bg-signal/10 border-signal/40' : 'bg-white/5 hover:bg-white/10 border-white/10',
              ].join(' ')}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate group-hover:underline">{p.name}</div>
                <div className="text-xs text-slate-400">PM: {p.pmName} {p.countryName ? `· ${p.countryName}` : ''}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold text-signal">{p.pct}%</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" strokeWidth={2} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
