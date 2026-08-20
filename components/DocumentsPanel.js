'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, Check, X, FileText } from 'lucide-react'
import { LINK_TYPE_OPTIONS, guessLinkType } from '@/lib/linkTypes'
import { newDocument } from '@/lib/documents'
import { AUDIT_ACTIONS } from '@/lib/auditLog'
import LinkTypeIcon from '@/components/LinkTypeIcon'

export default function DocumentsPanel({ documents, editable, onChange, logAction }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)

  function startAdd() {
    setDraft(newDocument())
    setAdding(true)
    setEditingId(null)
  }
  function startEdit(docItem) {
    setDraft({ ...docItem })
    setEditingId(docItem.id)
    setAdding(false)
  }
  function cancelDraft() {
    setDraft(null)
    setAdding(false)
    setEditingId(null)
  }
  function saveDraft() {
    if (!draft.url.trim()) return cancelDraft()
    const finalDraft = { ...draft, label: draft.label.trim() || draft.url.trim() }
    if (adding) {
      onChange([...(documents || []), finalDraft])
      logAction?.(AUDIT_ACTIONS.DOC_ADDED, `Added document "${finalDraft.label}"`)
    } else {
      onChange((documents || []).map((d) => (d.id === finalDraft.id ? finalDraft : d)))
      logAction?.(AUDIT_ACTIONS.DOC_EDITED, `Edited document "${finalDraft.label}"`)
    }
    cancelDraft()
  }
  function removeDocument(docItem) {
    onChange((documents || []).filter((d) => d.id !== docItem.id))
    logAction?.(AUDIT_ACTIONS.DOC_REMOVED, `Removed document "${docItem.label}"`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-ink" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate">Documents</span>
        </div>
        {editable && !adding && (
          <button onClick={startAdd} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Add
          </button>
        )}
      </div>

      <ul className="space-y-1.5">
        {(documents || []).length === 0 && !adding && <li className="text-sm text-slate-light italic">No documents added.</li>}

        {(documents || []).map((docItem) =>
          editingId === docItem.id ? (
            <li key={docItem.id}><DocumentForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></li>
          ) : (
            <li key={docItem.id} className="flex items-center justify-between gap-2 text-sm border border-transparent hover:border-line rounded-lg px-1.5 py-1 -mx-1.5">
              <a href={docItem.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-signal hover:underline truncate min-w-0">
                <LinkTypeIcon type={docItem.type} className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{docItem.label}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" strokeWidth={2} />
              </a>
              {editable && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(docItem)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                  <button onClick={() => removeDocument(docItem)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                </div>
              )}
            </li>
          )
        )}

        {adding && <li><DocumentForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></li>}
      </ul>
    </div>
  )
}

function DocumentForm({ draft, setDraft, onSave, onCancel }) {
  function handleUrlChange(url) {
    const guessedType = draft.url ? draft.type : guessLinkType(url)
    setDraft({ ...draft, url, type: guessedType })
  }

  return (
    <div className="border border-signal/40 rounded-lg px-3 py-2.5 bg-signal-light/30 space-y-2 mt-1">
      <input
        placeholder="https://…"
        value={draft.url}
        onChange={(e) => handleUrlChange(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      />
      <input
        placeholder="Label (e.g. Project proposal)"
        value={draft.label}
        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      />
      <select
        value={draft.type}
        onChange={(e) => setDraft({ ...draft, type: e.target.value })}
        className="w-full border border-line rounded-lg px-2 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      >
        {LINK_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
      </div>
    </div>
  )
}
