'use client'

import { useState } from 'react'
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, Pencil, Trash2, Check, X, Lock, AlertCircle } from 'lucide-react'
import { newColumn } from '@/lib/kanbanColumns'
import { saveErrorMessage } from '@/lib/firestoreErrors'

// Company-wide Sprint Board columns, same pattern/UI as StatusLibraryPanel.
// "To Do" and "Done" are the fixed bookends (fixed: true) — read-only here,
// always first/last on every project's board. Anything else is a custom
// column any Admin/PM can add, rename, or remove, shared by every project.
export default function KanbanColumnsPanel({ companyId, library }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')

  const sorted = [...(library || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const custom = sorted.filter((c) => !c.fixed)
  const todo = sorted.find((c) => c.id === 'todo')
  const done = sorted.find((c) => c.id === 'done')

  function startAdd() {
    const maxOrder = custom.reduce((m, c) => Math.max(m, c.order ?? 0), 0)
    setDraft(newColumn(maxOrder + 1))
    setAdding(true)
    setEditingId(null)
    setError('')
  }
  function startEdit(c) {
    setDraft({ ...c })
    setEditingId(c.id)
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
      await setDoc(doc(db, 'companies', companyId, 'kanbanColumnLibrary', draft.id), {
        name: draft.name.trim(),
        order: draft.order,
        fixed: false,
      })
      cancelDraft()
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  async function removeColumn(c) {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'kanbanColumnLibrary', c.id))
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  return (
    <div className="bg-surface border border-line rounded-card shadow-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate">Kanban columns</h2>
        {!adding && (
          <button onClick={startAdd} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> New column
          </button>
        )}
      </div>
      <p className="text-sm text-slate mb-4">Sprint Board columns shared by every project. &quot;To Do&quot; and &quot;Done&quot; are fixed; add or rename anything in between.</p>

      {error && (
        <div className="flex items-center gap-2 text-coral text-xs bg-coral-light border border-coral/20 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} /> {error}
        </div>
      )}

      {adding && <div className="mb-3"><ColumnForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></div>}

      <ul className="space-y-1.5">
        {todo && <FixedRow column={todo} />}

        {custom.map((c) =>
          editingId === c.id ? (
            <li key={c.id}><ColumnForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></li>
          ) : (
            <li key={c.id} className="flex items-center justify-between gap-3 text-sm border border-line rounded-lg px-3 py-2">
              <span className="font-medium text-ink truncate">{c.name}</span>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => startEdit(c)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                <button onClick={() => removeColumn(c)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
              </div>
            </li>
          )
        )}
        {custom.length === 0 && !adding && <li className="text-sm text-slate-light italic px-1">No custom columns yet.</li>}

        {done && <FixedRow column={done} />}
      </ul>
    </div>
  )
}

function FixedRow({ column }) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm border border-line bg-paper/60 rounded-lg px-3 py-2">
      <span className="font-medium text-ink truncate">{column.name}</span>
      <span className="text-[11px] text-slate-light flex items-center gap-1 flex-shrink-0"><Lock className="w-3 h-3" strokeWidth={2} /> Fixed</span>
    </li>
  )
}

function ColumnForm({ draft, setDraft, onSave, onCancel }) {
  return (
    <div className="border border-signal/40 rounded-lg px-3 py-2.5 bg-signal-light/30 space-y-2">
      <input
        autoFocus
        placeholder="Column name (e.g. QA)"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && onSave()}
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
      </div>
    </div>
  )
}
