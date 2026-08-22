'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Plus, X, Check, Pencil, KeyRound, Trash2 } from 'lucide-react'
import { useAdminData } from '@/contexts/AdminDataContext'
import { callAdminApi } from '@/lib/adminApi'
import { LabeledInput } from '@/components/FormFields'
import EmptyState from '@/components/EmptyState'
import { PersonRow, toneFor } from '@/app/admin/_components/PeopleTab'

// PM header row's own edit/reset/delete forms — same shape as PeopleTab's
// PersonRow modes, but the PM row also needs the expand chevron + nested
// team member list, so it isn't reused for the row itself, only for
// rendering each nested team member unchanged.

// Merges what used to be two separate pages ("Project managers" and "Team
// members") into one: each PM is a card that expands to show their own
// team members nested inside it, so the reporting relationship is shown
// structurally instead of via a "Reports to: X" caption on a flat list.
export default function AdminTeamManagementPage() {
  const { pms, teamMembers } = useAdminData()
  const [expanded, setExpanded] = useState(() => new Set())
  const [showPmForm, setShowPmForm] = useState(false)

  const teamByPm = useMemo(() => {
    const map = {}
    for (const tm of teamMembers) {
      if (!map[tm.pmId]) map[tm.pmId] = []
      map[tm.pmId].push(tm)
    }
    return map
  }, [teamMembers])

  function toggle(pmId) {
    setExpanded((cur) => {
      const next = new Set(cur)
      if (next.has(pmId)) next.delete(pmId)
      else next.add(pmId)
      return next
    })
  }

  return (
    <div className="page-fade">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-[30px] leading-[1.2] font-bold text-ink tracking-tight">Team Management</h1>
          <p className="text-slate text-base mt-1">Project managers and the team members who report to each of them.</p>
        </div>
        <button
          onClick={() => setShowPmForm((s) => !s)}
          className="flex items-center gap-2 flex-shrink-0 text-sm font-semibold px-5 py-2.5 rounded-full bg-signal text-white hover:bg-signal-dark shadow-card"
        >
          {showPmForm ? (<><X className="w-3.5 h-3.5" /> Cancel</>) : (<><Plus className="w-3 h-3" strokeWidth={3} /> New PM</>)}
        </button>
      </div>

      {showPmForm && <NewPersonForm role="pm" title="PM" onDone={() => setShowPmForm(false)} />}

      {pms.length === 0 ? (
        <EmptyState text="No project managers yet." />
      ) : (
        <div className="flex flex-col gap-4">
          {pms.map((pm) => (
            <PmCard
              key={pm.id}
              pm={pm}
              teamMembers={teamByPm[pm.id] || []}
              open={expanded.has(pm.id)}
              onToggle={() => toggle(pm.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PmCard({ pm, teamMembers, open, onToggle }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'reset' | 'delete'
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState(pm.name)
  const [email, setEmail] = useState(pm.email)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const tone = toneFor(pm.id)

  function reset() {
    setMode('view')
    setName(pm.name)
    setEmail(pm.email)
    setPassword('')
    setError('')
  }

  async function saveEdit() {
    setBusy(true)
    setError('')
    try {
      await callAdminApi('/api/update-user', { uid: pm.id, name, email })
      setMode('view')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function savePassword() {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await callAdminApi('/api/reset-password', { uid: pm.id, password })
      reset()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    setBusy(true)
    setError('')
    try {
      await callAdminApi('/api/delete-user', { uid: pm.id })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (mode === 'edit') {
    return (
      <div className="bg-surface border border-line rounded-card shadow-card p-5 space-y-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="bg-surface text-ink border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal" placeholder="Name" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-surface text-ink border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal" placeholder="Email" />
        </div>
        {error && <p className="text-coral text-xs">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={reset} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
          <button onClick={saveEdit} disabled={busy} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark disabled:opacity-50 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
        </div>
      </div>
    )
  }

  if (mode === 'reset') {
    return (
      <div className="bg-surface border border-line rounded-card shadow-card p-5 space-y-2">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-surface text-ink border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal"
          placeholder="New temporary password"
        />
        {error && <p className="text-coral text-xs">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={reset} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
          <button onClick={savePassword} disabled={busy} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark disabled:opacity-50 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Set password</button>
        </div>
      </div>
    )
  }

  if (mode === 'delete') {
    return (
      <div className="bg-surface border border-coral-light rounded-card shadow-card p-5 flex items-center justify-between gap-3">
        <span className="text-sm">Remove <strong>{pm.name}</strong>&rsquo;s account? {teamMembers.length > 0 ? `Their ${teamMembers.length} team member${teamMembers.length === 1 ? '' : 's'} will remain, unassigned.` : ''} This can&rsquo;t be undone.</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {error && <p className="text-coral text-xs">{error}</p>}
          <button onClick={reset} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink">Cancel</button>
          <button onClick={confirmDelete} disabled={busy} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-coral text-white hover:bg-coral/90 disabled:opacity-50">
            {busy ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-line rounded-card shadow-card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-paper/60 transition-colors">
        <div className="flex items-center gap-4 min-w-0">
          <ChevronRight className={`w-4 h-4 text-slate-light flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} strokeWidth={2} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-base flex-shrink-0 ${tone.bg} ${tone.text}`}>
            {pm.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-ink truncate">{pm.name}</div>
            <div className="text-sm text-slate truncate">{pm.email} <span className="text-slate-light">· PM · {teamMembers.length} team member{teamMembers.length === 1 ? '' : 's'}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 text-slate" onClick={(e) => e.stopPropagation()}>
          <button title="Edit" onClick={() => setMode('edit')} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-paper hover:text-ink"><Pencil className="w-4 h-4" strokeWidth={1.75} /></button>
          <button title="Reset password" onClick={() => setMode('reset')} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-paper hover:text-ink"><KeyRound className="w-4 h-4" strokeWidth={1.75} /></button>
          <button title="Remove" onClick={() => setMode('delete')} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-coral-light hover:text-coral"><Trash2 className="w-4 h-4" strokeWidth={1.75} /></button>
        </div>
      </button>

      {open && (
        <div className="border-t border-line bg-paper/40 p-5 pl-[4.25rem] space-y-3">
          {teamMembers.length === 0 && !showAddForm && (
            <p className="text-sm text-slate-light italic">No team members under {pm.name.split(' ')[0]} yet.</p>
          )}
          {teamMembers.map((tm) => (
            <PersonRow key={tm.id} person={tm} />
          ))}

          {showAddForm ? (
            <NewPersonForm role="team_member" title="team member" fixedPmId={pm.id} onDone={() => setShowAddForm(false)} />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-signal hover:text-signal-dark"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add team member under {pm.name.split(' ')[0]}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Inline "new person" form shared by the "New PM" header action and each
// PM card's "Add team member" action. When fixedPmId is set, the person
// being created is unambiguously scoped to that PM by where the form
// appears (nested inside that PM's card) — there's no separate PM picker
// to get wrong, and no way to submit without that PM already implied.
function NewPersonForm({ role, title, fixedPmId, onDone }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function create(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await callAdminApi('/api/create-user', { name, email, role, ...(fixedPmId ? { pmId: fixedPmId } : {}) })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={create} className="bg-surface border border-signal/40 rounded-card shadow-card p-5 grid gap-3 md:grid-cols-3 items-end">
      <LabeledInput label="Name" value={name} onChange={setName} />
      <LabeledInput label="Email" value={email} onChange={setEmail} type="email" />
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="text-sm font-medium px-4 py-2.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button type="submit" disabled={busy} className="flex-1 text-sm font-medium px-4 py-2.5 rounded-lg bg-signal text-white hover:bg-signal-dark disabled:opacity-50 flex items-center justify-center gap-1">
          <Check className="w-3.5 h-3.5" /> {busy ? 'Adding…' : `Add ${title}`}
        </button>
      </div>
      {error && <p className="text-coral text-xs md:col-span-3">{error}</p>}
      <p className="text-slate-light text-xs md:col-span-3">They&rsquo;ll get an email with a link to set their own password.</p>
    </form>
  )
}
