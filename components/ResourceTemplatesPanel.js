'use client'

import { useState } from 'react'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, Pencil, Trash2, Check, X, ClipboardList, AlertCircle } from 'lucide-react'
import { newResourceTemplate } from '@/lib/templates'
import { saveErrorMessage } from '@/lib/firestoreErrors'
import ResourcesTable from '@/components/ResourcesTable'

// Requirement Sheet templates — the Resources & Credentials sections a new
// project starts with. Independent from Roadmap templates so either can be
// picked on its own when creating a project.
export default function ResourceTemplatesPanel({ companyId, templates }) {
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  function startAdd() {
    setEditing(newResourceTemplate())
    setError('')
  }
  function startEdit(t) {
    setEditing({
      ...t,
      resourceSections: (t.resourceSections || []).map((s) => ({ ...s, items: (s.items || []).map((it) => ({ ...it })) })),
    })
    setError('')
  }
  function cancel() {
    setEditing(null)
    setError('')
  }

  async function save() {
    if (!editing.name.trim()) return cancel()
    const { id, ...data } = editing
    try {
      await setDoc(doc(db, 'companies', companyId, 'resourceTemplates', id), {
        name: data.name.trim(),
        resourceSections: (data.resourceSections || []).filter((s) => s.name.trim()),
      })
      cancel()
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  async function removeTemplate(t) {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'resourceTemplates', t.id))
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  return (
    <div className="bg-surface border border-line rounded-card shadow-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate">Requirement sheet templates</h2>
        {!editing && (
          <button onClick={startAdd} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> New template
          </button>
        )}
      </div>
      <p className="text-sm text-slate mb-4">Default Resources & Credentials sections to pre-fill a new project's requirement sheet.</p>

      {error && (
        <div className="flex items-center gap-2 text-coral text-xs bg-coral-light border border-coral/20 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} /> {error}
        </div>
      )}

      {editing && (
        <div className="mb-4 border border-signal/40 rounded-lg px-4 py-4 bg-signal-light/20 space-y-4">
          <input
            placeholder="Template name"
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface font-medium"
          />

          <ResourcesTable
            sections={editing.resourceSections}
            onChange={(resourceSections) => setEditing({ ...editing, resourceSections })}
          />

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={cancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save template</button>
          </div>
        </div>
      )}

      <ul className="space-y-1.5">
        {templates.length === 0 && !editing && <li className="text-sm text-slate-light italic">No requirement sheet templates yet.</li>}
        {templates.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 text-sm border border-line rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <ClipboardList className="w-4 h-4 text-slate-light flex-shrink-0" strokeWidth={1.75} />
              <div className="min-w-0">
                <div className="font-medium text-ink truncate">{t.name}</div>
                <div className="text-[11px] text-slate-light">
                  {(t.resourceSections || []).reduce((n, s) => n + (s.items || []).length, 0)} resources
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => startEdit(t)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
              <button onClick={() => removeTemplate(t)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
