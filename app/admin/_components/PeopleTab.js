'use client'

import { useState } from 'react'
import { Pencil, Trash2, KeyRound, Check, X, Plus } from 'lucide-react'
import { callAdminApi } from '@/lib/adminApi'
import { LabeledInput, LabeledSelect } from '@/components/FormFields'
import EmptyState from '@/components/EmptyState'

const AVATAR_TONES = [
  { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { bg: 'bg-amber-50', text: 'text-amber-600' },
  { bg: 'bg-rose-50', text: 'text-rose-600' },
  { bg: 'bg-sky-50', text: 'text-sky-600' },
]

function toneFor(id) {
  let hash = 0
  for (const ch of id || '') hash = (hash + ch.charCodeAt(0)) % AVATAR_TONES.length
  return AVATAR_TONES[hash]
}

// pmOptions: pass when the caller (Admin) must choose which PM a new team
// member reports to. Omit it when the caller is that PM (creating for
// themselves — the server infers pmId from the caller's own uid).
// pmNameById: optional map used to show "Reports to: X" on each row.
export default function PeopleTab({ people, role, title, pageTitle, subtitle, pmOptions, pmNameById }) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pmId, setPmId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function createPerson(e) {
    e.preventDefault()
    setError('')
    if (pmOptions && !pmId) {
      setError('Choose which PM this team member reports to.')
      return
    }
    setBusy(true)
    try {
      await callAdminApi('/api/create-user', { name, email, role, ...(pmOptions ? { pmId } : {}) })
      setName('')
      setEmail('')
      setPmId('')
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-[30px] leading-[1.2] font-bold text-ink tracking-tight">{pageTitle}</h1>
          {subtitle && <p className="text-slate text-base mt-1">{subtitle}</p>}
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 flex-shrink-0 text-sm font-semibold px-5 py-2.5 rounded-full bg-signal text-white hover:bg-signal-dark shadow-card"
        >
          {showForm ? (<><X className="w-3.5 h-3.5" /> Cancel</>) : (<><Plus className="w-3 h-3" strokeWidth={3} /> New {title.toLowerCase()}</>)}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPerson} className={`bg-surface border border-line rounded-card shadow-card p-6 mb-6 grid gap-3 items-end ${pmOptions ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <LabeledInput label="Name" value={name} onChange={setName} />
          <LabeledInput label="Email" value={email} onChange={setEmail} type="email" />
          {pmOptions && (
            <LabeledSelect label="Reports to" value={pmId} onChange={setPmId} options={pmOptions} empty="No PMs yet" />
          )}
          <button
            type="submit"
            disabled={busy}
            className="text-sm font-medium px-4 py-2.5 rounded-lg bg-signal text-white hover:bg-signal-dark disabled:opacity-50"
          >
            {busy ? 'Creating…' : `Add ${title.toLowerCase()}`}
          </button>
          {error && <p className="text-coral text-xs md:col-span-4">{error}</p>}
          <p className="text-slate-light text-xs md:col-span-4">
            They&rsquo;ll get an email with a link to set their own password.
          </p>
        </form>
      )}

      {people.length === 0 ? (
        <EmptyState text={`No ${title.toLowerCase()}s yet.`} />
      ) : (
        <div className="flex flex-col gap-4">
          {people.map((p) => (
            <PersonRow key={p.id} person={p} reportsTo={pmNameById?.[p.pmId]} />
          ))}
        </div>
      )}
    </div>
  )
}

function PersonRow({ person, reportsTo }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'reset' | 'delete'
  const [name, setName] = useState(person.name)
  const [email, setEmail] = useState(person.email)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const tone = toneFor(person.id)

  function reset() {
    setMode('view')
    setName(person.name)
    setEmail(person.email)
    setPassword('')
    setError('')
  }

  async function saveEdit() {
    setBusy(true)
    setError('')
    try {
      await callAdminApi('/api/update-user', { uid: person.id, name, email })
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
      await callAdminApi('/api/reset-password', { uid: person.id, password })
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
      await callAdminApi('/api/delete-user', { uid: person.id })
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
        <span className="text-sm">Remove <strong>{person.name}</strong>&rsquo;s account? This can&rsquo;t be undone.</span>
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
    <div className="bg-surface border border-line rounded-card shadow-card p-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-base flex-shrink-0 ${tone.bg} ${tone.text}`}>
          {person.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-ink truncate">{person.name}</div>
          <div className="text-sm text-slate truncate">
            {person.email}
            {reportsTo && <span className="text-slate-light"> · Reports to {reportsTo}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 text-slate">
        <button title="Edit" onClick={() => setMode('edit')} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-paper hover:text-ink"><Pencil className="w-4 h-4" strokeWidth={1.75} /></button>
        <button title="Reset password" onClick={() => setMode('reset')} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-paper hover:text-ink"><KeyRound className="w-4 h-4" strokeWidth={1.75} /></button>
        <button title="Remove" onClick={() => setMode('delete')} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-coral-light hover:text-coral"><Trash2 className="w-4 h-4" strokeWidth={1.75} /></button>
      </div>
    </div>
  )
}
