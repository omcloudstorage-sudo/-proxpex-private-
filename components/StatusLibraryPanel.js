'use client'

import { useState } from 'react'
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, Pencil, Trash2, Check, X, AlertCircle } from 'lucide-react'
import { newStatus, STATUS_KIND_OPTIONS, MAX_ACTIVE_STATUSES } from '@/lib/statusLibrary'
import { saveErrorMessage } from '@/lib/firestoreErrors'

export default function StatusLibraryPanel({ companyId, library }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')

  const activeCount = library.filter((s) => s.active).length

  function startAdd() {
    setDraft(newStatus())
    setAdding(true)
    setEditingId(null)
    setError('')
  }
  function startEdit(s) {
    setDraft({ ...s })
    setEditingId(s.id)
    setAdding(false)
    setError('')
  }
  function cancelDraft() {
    setDraft(null)
    setAdding(false)
    setEditingId(null)
    setError('')
  }

  async function saveDraft() {
    if (!draft.name.trim()) return cancelDraft()
    if (draft.active) {
      const othersActive = library.filter((s) => s.id !== draft.id && s.active).length
      if (othersActive >= MAX_ACTIVE_STATUSES) {
        setError(`Only ${MAX_ACTIVE_STATUSES} statuses can be active at once. Deactivate one first.`)
        return
      }
    }
    try {
      await setDoc(doc(db, 'companies', companyId, 'statusLibrary', draft.id), {
        name: draft.name.trim(),
        color: draft.color,
        kind: draft.kind,
        active: !!draft.active,
      })
      cancelDraft()
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  async function toggleActive(s) {
    if (!s.active && activeCount >= MAX_ACTIVE_STATUSES) {
      setError(`Only ${MAX_ACTIVE_STATUSES} statuses can be active at once. Deactivate one first.`)
      return
    }
    setError('')
    try {
      await updateDoc(doc(db, 'companies', companyId, 'statusLibrary', s.id), { active: !s.active })
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  async function removeStatus(s) {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'statusLibrary', s.id))
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  return (
    <div className="bg-surface border border-line rounded-card shadow-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate">Status library</h2>
        {!adding && (
          <button onClick={startAdd} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> New status
          </button>
        )}
      </div>
      <p className="text-sm text-slate mb-4">Custom stage statuses shared across every project. Up to {MAX_ACTIVE_STATUSES} can be active at once.</p>

      {error && (
        <div className="flex items-center gap-2 text-coral text-xs bg-coral-light border border-coral/20 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} /> {error}
        </div>
      )}

      {adding && <div className="mb-3"><StatusForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></div>}

      <ul className="space-y-1.5">
        {library.length === 0 && !adding && <li className="text-sm text-slate-light italic">No statuses yet.</li>}
        {library.map((s) =>
          editingId === s.id ? (
            <li key={s.id}><StatusForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></li>
          ) : (
            <li key={s.id} className="flex items-center justify-between gap-3 text-sm border border-line rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="font-medium text-ink truncate">{s.name}</span>
                <span className="text-[11px] text-slate-light flex-shrink-0">{STATUS_KIND_OPTIONS.find((k) => k.value === s.kind)?.label}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => toggleActive(s)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${s.active ? 'bg-progress/10 text-progress border-progress/20' : 'bg-paper text-slate border-line'}`}
                >
                  {s.active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => startEdit(s)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                <button onClick={() => removeStatus(s)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  )
}

function StatusForm({ draft, setDraft, onSave, onCancel }) {
  return (
    <div className="border border-signal/40 rounded-lg px-3 py-2.5 bg-signal-light/30 space-y-2">
      <input
        placeholder="Status name (e.g. Blocked)"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      />
      <div className="flex gap-2">
        <input
          type="color"
          value={draft.color}
          onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          className="w-10 h-9 border border-line rounded-lg bg-surface p-1"
        />
        <select
          value={draft.kind}
          onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
          className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm outline-none focus:border-signal bg-surface"
        >
          {STATUS_KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate">
        <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
        Active (usable on stages)
      </label>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
      </div>
    </div>
  )
}
