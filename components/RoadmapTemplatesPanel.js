'use client'

import { useState } from 'react'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, Pencil, Trash2, Check, X, Milestone, AlertCircle } from 'lucide-react'
import { newRoadmapTemplate } from '@/lib/templates'
import { saveErrorMessage } from '@/lib/firestoreErrors'

// Roadmap templates bundle a stage list and a status set — kept together
// since a stage needs a status to start in. Independent from Requirement
// Sheet templates (see ResourceTemplatesPanel) so a project can mix and
// match either at creation time.
export default function RoadmapTemplatesPanel({ companyId, templates, library }) {
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const activeLibrary = library.filter((s) => s.active)

  function startAdd() {
    setEditing(newRoadmapTemplate())
    setError('')
  }
  function startEdit(t) {
    setEditing({
      ...t,
      stages: (t.stages || []).map((s) => ({ ...s })),
      statusIds: [...(t.statusIds || [])],
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
      await setDoc(doc(db, 'companies', companyId, 'roadmapTemplates', id), {
        name: data.name.trim(),
        stages: data.stages.filter((s) => s.name.trim()).map((s, i) => ({ name: s.name.trim(), order: i })),
        statusIds: data.statusIds,
      })
      cancel()
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  async function removeTemplate(t) {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'roadmapTemplates', t.id))
    } catch (err) {
      setError(saveErrorMessage(err))
    }
  }

  return (
    <div className="bg-surface border border-line rounded-card shadow-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate">Roadmap templates</h2>
        {!editing && (
          <button onClick={startAdd} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> New template
          </button>
        )}
      </div>
      <p className="text-sm text-slate mb-4">A stage list and status set to pre-fill a new project's roadmap.</p>

      {error && (
        <div className="flex items-center gap-2 text-coral text-xs bg-coral-light border border-coral/20 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} /> {error}
        </div>
      )}

      {editing && (
        <div className="mb-4">
          <RoadmapTemplateForm draft={editing} setDraft={setEditing} activeLibrary={activeLibrary} onSave={save} onCancel={cancel} />
        </div>
      )}

      <ul className="space-y-1.5">
        {templates.length === 0 && !editing && <li className="text-sm text-slate-light italic">No roadmap templates yet.</li>}
        {templates.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 text-sm border border-line rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Milestone className="w-4 h-4 text-slate-light flex-shrink-0" strokeWidth={1.75} />
              <div className="min-w-0">
                <div className="font-medium text-ink truncate">{t.name}</div>
                <div className="text-[11px] text-slate-light">
                  {(t.stages || []).length} stages · {(t.statusIds || []).length} statuses
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

function RoadmapTemplateForm({ draft, setDraft, activeLibrary, onSave, onCancel }) {
  function updateStageName(i, name) {
    const stages = [...draft.stages]
    stages[i] = { ...stages[i], name }
    setDraft({ ...draft, stages })
  }
  function addStage() {
    setDraft({ ...draft, stages: [...draft.stages, { name: '', order: draft.stages.length }] })
  }
  function removeStage(i) {
    setDraft({ ...draft, stages: draft.stages.filter((_, idx) => idx !== i) })
  }

  function toggleStatus(id) {
    const has = draft.statusIds.includes(id)
    if (has) setDraft({ ...draft, statusIds: draft.statusIds.filter((s) => s !== id) })
    else if (draft.statusIds.length < 6) setDraft({ ...draft, statusIds: [...draft.statusIds, id] })
  }

  return (
    <div className="border border-signal/40 rounded-lg px-4 py-4 bg-signal-light/20 space-y-4">
      <input
        placeholder="Template name"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface font-medium"
      />

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Stages</div>
        <div className="space-y-1.5">
          {draft.stages.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={s.name}
                onChange={(e) => updateStageName(i, e.target.value)}
                className="flex-1 border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
              />
              <button onClick={() => removeStage(i)} className="text-slate-light hover:text-coral flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <button onClick={addStage} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium mt-1.5">
          <Plus className="w-3 h-3" /> Add stage
        </button>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Statuses (up to 6, from active library)</div>
        {activeLibrary.length === 0 ? (
          <p className="text-xs text-slate-light italic">No active statuses in the library yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeLibrary.map((s) => {
              const checked = draft.statusIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStatus(s.id)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${checked ? 'border-signal text-signal bg-surface' : 'border-line text-slate bg-surface'}`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save template</button>
      </div>
    </div>
  )
}
