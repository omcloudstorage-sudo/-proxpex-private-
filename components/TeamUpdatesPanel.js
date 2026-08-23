'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus, Check, X, Video, MessageSquare } from 'lucide-react'
import EntryModal from '@/components/EntryModal'

// Project-wide feed (migrated from the old per-stage Team Updates — see
// lib/teamUpdates.js). Each entry optionally carries stageName so entries
// created before the restructure (or posted while a stage is active) stay
// traceable to the stage they relate to.
export default function TeamUpdatesPanel({ updates, canPost, currentUser, onPost, onEdit, onDelete, stages }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [openEntry, setOpenEntry] = useState(null)

  const sorted = [...(updates || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  function startAdd() {
    setDraft({ text: '', meetingLink: '', stageId: stages?.[0]?.id || '' })
    setAdding(true)
    setEditingId(null)
  }
  function startEdit(entry) {
    setDraft({ text: entry.text, meetingLink: entry.meetingLink || '', stageId: entry.stageId || '' })
    setEditingId(entry.id)
    setAdding(false)
  }
  function cancelDraft() {
    setDraft(null)
    setAdding(false)
    setEditingId(null)
  }
  function saveDraft() {
    if (!draft.text.trim()) return cancelDraft()
    const stageName = stages?.find((s) => s.id === draft.stageId)?.name || ''
    if (adding) onPost({ ...draft, stageName })
    else onEdit(editingId, { ...draft, stageName })
    cancelDraft()
  }
  function canEditEntry(entry) {
    return currentUser?.role === 'admin' || (entry.authorId && entry.authorId === currentUser?.uid)
  }

  return (
    <div className="bg-surface/90 backdrop-blur border border-line rounded-card shadow-card p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-ink" strokeWidth={1.75} />
          <span className="font-display text-xl font-semibold text-ink uppercase tracking-wide">Team Updates</span>
        </div>
        {canPost && !adding && (
          <button onClick={startAdd} className="text-ink hover:text-signal flex items-center gap-1 text-sm font-semibold">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Post
          </button>
        )}
      </div>
      <p className="text-sm text-slate mb-4">Project-wide notes — anyone on the team can post.</p>

      {adding && <div className="mb-2.5"><UpdateForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} stages={stages} /></div>}

      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {sorted.length === 0 && !adding && (
          <p className="text-sm text-slate-light italic">No updates yet{canPost ? ' — be the first to post one.' : '.'}</p>
        )}

        {sorted.map((entry) =>
          editingId === entry.id ? (
            <UpdateForm key={entry.id} draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} stages={stages} />
          ) : (
            <div
              key={entry.id}
              onClick={() => setOpenEntry(entry)}
              className="bg-paper border border-line rounded-lg px-4 py-3.5 text-sm cursor-pointer hover:border-ink/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 text-xs text-slate min-w-0 flex-wrap">
                  <span className="font-semibold text-ink truncate">{entry.authorName || 'Unknown'}</span>
                  <span className="text-slate-light flex-shrink-0">{formatTimestamp(entry.createdAt)}</span>
                  {entry.stageName && (
                    <span className="bg-surface border border-line rounded-full px-2 py-0.5 text-[10px] flex-shrink-0">{entry.stageName}</span>
                  )}
                  {entry.meetingLink && (
                    <a href={entry.meetingLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-signal hover:underline flex-shrink-0">
                      <Video className="w-3 h-3" strokeWidth={2} /> Meeting
                    </a>
                  )}
                </div>
                {canEditEntry(entry) && (
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => startEdit(entry)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    <button onClick={() => onDelete(entry.id)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                  </div>
                )}
              </div>
              <p className="text-ink whitespace-pre-wrap break-words leading-relaxed line-clamp-2">{entry.text}</p>
            </div>
          )
        )}
      </div>

      <EntryModal
        open={!!openEntry}
        onClose={() => setOpenEntry(null)}
        title={openEntry?.authorName || 'Unknown'}
        meta={openEntry && (
          <>
            <span>{formatTimestamp(openEntry.createdAt)}</span>
            {openEntry.stageName && <span>{openEntry.stageName}</span>}
            {openEntry.meetingLink && (
              <a href={openEntry.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal hover:underline">
                <Video className="w-3 h-3" strokeWidth={2} /> Meeting
              </a>
            )}
          </>
        )}
      >
        {openEntry?.text}
      </EntryModal>
    </div>
  )
}

function UpdateForm({ draft, setDraft, onSave, onCancel, stages }) {
  return (
    <div className="border border-signal/40 rounded-lg px-3 py-2.5 bg-signal-light/30 space-y-2">
      <textarea
        autoFocus
        value={draft.text}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        rows={3}
        placeholder="What happened, decisions, action items…"
        className="w-full border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal resize-none bg-surface"
      />
      <div className="flex gap-2">
        {stages?.length > 0 && (
          <select
            value={draft.stageId || ''}
            onChange={(e) => setDraft({ ...draft, stageId: e.target.value })}
            className="border border-line rounded-lg px-2 py-1.5 text-xs outline-none focus:border-signal bg-surface"
          >
            <option value="">No stage</option>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <input
          placeholder="Meeting link — optional"
          value={draft.meetingLink || ''}
          onChange={(e) => setDraft({ ...draft, meetingLink: e.target.value })}
          className="flex-1 border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Post</button>
      </div>
    </div>
  )
}

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
