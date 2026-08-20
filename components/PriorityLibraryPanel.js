'use client'

import { useState } from 'react'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, Pencil, Trash2, Check, X, AlertCircle } from 'lucide-react'
import { newPriority, sortedPriorities } from '@/lib/priorityLibrary'
import { saveErrorMessage } from '@/lib/firestoreErrors'

export default function PriorityLibraryPanel({ companyId, library }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const sorted = sortedPriorities(library)

  function startAdd() {
    setDraft(newPriority(sorted.length))
    setAdding(true)
    setEditingId(null)
    setError('')
  }
  function startEdit(p) {
    setDraft({ ...p })
    setEditingId(p.id)
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
    try {
      await setDoc(doc(db, 'companies', companyId, 'priorityLibrary', draft.id), {
        name: draft.name.trim(),
        color: draft.color,
        order: draft.order ?? sorted.length,
      })
      cancelDraft()
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  async function removePriority(p) {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'priorityLibrary', p.id))
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  return (
    <div className="bg-surface border border-line rounded-card shadow-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate">Priority levels</h2>
        {!adding && (
          <button onClick={startAdd} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> New priority
          </button>
        )}
      </div>
      <p className="text-sm text-slate mb-4">Company-wide priority levels. Listed in display order.</p>

      {error && (
        <div className="flex items-center gap-2 text-coral text-xs bg-coral-light border border-coral/20 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} /> {error}
        </div>
      )}

      {adding && <div className="mb-3"><PriorityForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></div>}

      <ul className="space-y-1.5">
        {sorted.length === 0 && !adding && <li className="text-sm text-slate-light italic">No priority levels yet.</li>}
        {sorted.map((p) =>
          editingId === p.id ? (
            <li key={p.id}><PriorityForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></li>
          ) : (
            <li key={p.id} className="flex items-center justify-between gap-3 text-sm border border-line rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="font-medium text-ink truncate">{p.name}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => startEdit(p)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                <button onClick={() => removePriority(p)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  )
}

function PriorityForm({ draft, setDraft, onSave, onCancel }) {
  return (
    <div className="border border-signal/40 rounded-lg px-3 py-2.5 bg-signal-light/30 space-y-2">
      <input
        placeholder="Priority name (e.g. Blocker)"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      />
      <input
        type="color"
        value={draft.color}
        onChange={(e) => setDraft({ ...draft, color: e.target.value })}
        className="w-10 h-9 border border-line rounded-lg bg-surface p-1"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
      </div>
    </div>
  )
}
