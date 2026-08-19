'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, Check, X, Video, ExternalLink, ChevronDown, ChevronUp, ShieldCheck, MessageSquare, ClipboardList } from 'lucide-react'
import { STATUS, normalizeStage, newUpdate, newLink } from '@/lib/stages'
import { MOM_STATUS, MOM_STATUS_LABELS } from '@/lib/momEntries'
import { AUDIT_ACTIONS } from '@/lib/auditLog'
import { LINK_TYPE_OPTIONS, guessLinkType } from '@/lib/linkTypes'
import LinkTypeIcon from '@/components/LinkTypeIcon'

export default function StagePanel({
  stage,
  canManage,
  canPostUpdate,
  currentUser,
  onChange,
  logAction,
  momEntries,
  onCreateMom,
  onUpdateMom,
  onDeleteMom,
  onApproveMom,
}) {
  const [local, setLocal] = useState(stage ? normalizeStage(stage) : null)

  useEffect(() => setLocal(stage ? normalizeStage(stage) : null), [stage])

  if (!local) {
    return (
      <div className="bg-white/90 backdrop-blur border border-black/5 rounded-card shadow-card p-8 text-center text-slate text-sm">
        Select a stage to view its details.
      </div>
    )
  }

  function commit(patch) {
    const updated = { ...local, ...patch }
    setLocal(updated)
    onChange?.(updated)
  }

  function changeStatus(status) {
    logAction?.(AUDIT_ACTIONS.STAGE_STATUS_CHANGED, `Changed "${local.name}" status to ${status.replace('_', ' ')}`, local.id)
    commit({ status })
  }

  function changeDueDate(dueDate) {
    logAction?.(AUDIT_ACTIONS.STAGE_DATE_CHANGED, `Set "${local.name}" next milestone to ${dueDate || '—'}`, local.id)
    commit({ dueDate })
  }

  const daysLeft = getDaysLeft(local.dueDate)

  return (
    <div className="space-y-6">
      <div className="bg-white/90 backdrop-blur border border-black/5 rounded-card shadow-card p-6 md:p-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            {canManage ? (
              <input
                value={local.name}
                onChange={(e) => commit({ name: e.target.value })}
                className="font-display text-[28px] font-semibold text-ink tracking-tight outline-none border-b border-transparent focus:border-line -ml-0.5 px-0.5"
              />
            ) : (
              <h3 className="font-display text-[28px] font-semibold text-ink tracking-tight">{local.name}</h3>
            )}
            <StatusBadge status={local.status} />
          </div>

          {canManage && (
            <select
              value={local.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="text-sm bg-paper border border-line rounded-lg px-3 py-2 font-medium text-ink outline-none focus:border-signal"
            >
              <option value={STATUS.PENDING}>Pending</option>
              <option value={STATUS.IN_PROGRESS}>In progress</option>
              <option value={STATUS.DONE}>Done</option>
            </select>
          )}
        </div>

        <DocumentLinks links={local.links} editable={canManage} logAction={logAction} stageId={local.id} onChange={(links) => commit({ links })} />

        <div className="mt-6 pt-6 border-t border-line flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">Next milestone</span>
            {canManage ? (
              <input
                type="date"
                value={local.dueDate || ''}
                onChange={(e) => changeDueDate(e.target.value)}
                className="bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-signal"
              />
            ) : (
              <span className="text-sm text-ink">{local.dueDate || '—'}</span>
            )}
          </div>
          {daysLeft !== null && (
            <span
              className={[
                'text-xs font-medium px-3 py-1 rounded-full border',
                daysLeft < 0
                  ? 'bg-coral-light text-coral border-coral/20'
                  : daysLeft <= 3
                    ? 'bg-amber-light text-amber border-amber/20'
                    : 'bg-progress/10 text-progress border-progress/20',
              ].join(' ')}
            >
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d remaining`}
            </span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/90 backdrop-blur border border-black/5 rounded-card shadow-card p-6 h-[400px] flex flex-col">
          <TeamUpdates
            updates={local.updates}
            canPost={canPostUpdate}
            currentUser={currentUser}
            onChange={(updates) => commit({ updates })}
            logAction={logAction}
            stageId={local.id}
            stageName={local.name}
          />
        </div>
        <div className="bg-white/90 backdrop-blur border border-black/5 rounded-card shadow-card p-6 h-[400px] flex flex-col">
          <MomPanel
            entries={momEntries}
            canManage={canManage}
            currentUser={currentUser}
            onCreate={onCreateMom}
            onUpdate={onUpdateMom}
            onDelete={onDeleteMom}
            onApprove={onApproveMom}
            onSubmit={(id) => onUpdateMom?.(id, { status: MOM_STATUS.PENDING })}
          />
        </div>
      </div>
    </div>
  )
}

function TeamUpdates({ updates, canPost, currentUser, onChange, logAction, stageId, stageName }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)

  const sorted = [...(updates || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  function startAdd() {
    setDraft(newUpdate(currentUser))
    setAdding(true)
    setEditingId(null)
  }
  function startEdit(entry) {
    setDraft({ ...entry })
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
    if (adding) {
      onChange([...(updates || []), draft])
      logAction?.(AUDIT_ACTIONS.TEAM_UPDATE_POSTED, `Posted a team update on "${stageName}"`, stageId)
    } else {
      onChange((updates || []).map((e) => (e.id === draft.id ? draft : e)))
    }
    cancelDraft()
  }
  function removeEntry(id) {
    onChange((updates || []).filter((e) => e.id !== id))
  }
  function canEditEntry(entry) {
    return currentUser?.role === 'admin' || (entry.authorId && entry.authorId === currentUser?.uid)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-ink" strokeWidth={1.75} />
          <span className="font-display text-xl font-semibold text-ink uppercase tracking-wide">Team Updates</span>
        </div>
        {canPost && !adding && (
          <button onClick={startAdd} className="text-ink hover:text-signal flex items-center gap-1 text-sm font-semibold flex-shrink-0">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Post
          </button>
        )}
      </div>
      <p className="text-sm text-slate mb-4 flex-shrink-0">Casual notes — anyone on the team can post.</p>

      {adding && <div className="mb-2.5 flex-shrink-0"><UpdateForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></div>}

      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-0">
        {sorted.length === 0 && !adding && <p className="text-sm text-slate-light italic">No updates yet.</p>}

        {sorted.map((entry) =>
          editingId === entry.id ? (
            <UpdateForm key={entry.id} draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} />
          ) : (
            <div key={entry.id} className="bg-paper border border-line rounded-lg px-4 py-3.5 text-sm">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 text-xs text-slate min-w-0">
                  <span className="font-semibold text-ink truncate">{entry.authorName || 'Unknown'}</span>
                  <span className="text-slate-light flex-shrink-0">{formatTimestamp(entry.createdAt)}</span>
                  {entry.meetingLink && (
                    <a href={entry.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal hover:underline flex-shrink-0">
                      <Video className="w-3 h-3" strokeWidth={2} /> Meeting
                    </a>
                  )}
                </div>
                {canEditEntry(entry) && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(entry)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    <button onClick={() => removeEntry(entry.id)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                  </div>
                )}
              </div>
              <TruncatedText text={entry.text} />
            </div>
          )
        )}
      </div>
    </div>
  )
}

function UpdateForm({ draft, setDraft, onSave, onCancel }) {
  return (
    <div className="border border-signal/40 rounded-lg px-3 py-2.5 bg-signal-light/30 space-y-2">
      <textarea
        autoFocus
        value={draft.text}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        rows={3}
        placeholder="What happened, decisions, action items…"
        className="w-full border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal resize-none bg-white"
      />
      <input
        placeholder="Meeting link (Google Meet, Zoom…) — optional"
        value={draft.meetingLink || ''}
        onChange={(e) => setDraft({ ...draft, meetingLink: e.target.value })}
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-white"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-ink text-paper hover:bg-ink/90 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Post</button>
      </div>
    </div>
  )
}

function MomPanel({ entries, canManage, currentUser, onCreate, onUpdate, onDelete, onApprove, onSubmit }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)

  const isClient = currentUser?.role === 'client'
  const sorted = [...(entries || [])].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))

  function startAdd() {
    setDraft({ text: '', meetingLink: '', date: '' })
    setAdding(true)
    setEditingId(null)
  }
  function startEdit(entry) {
    setDraft({ text: entry.text, meetingLink: entry.meetingLink || '', date: entry.date || '' })
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
    if (adding) onCreate?.(draft)
    else onUpdate?.(editingId, draft)
    cancelDraft()
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-[18px] h-[18px] text-ink" strokeWidth={1.75} />
          <span className="font-display text-xl font-semibold text-ink uppercase tracking-wide">MOM</span>
        </div>
        {canManage && !adding && (
          <button onClick={startAdd} className="text-ink hover:text-signal flex items-center gap-1 text-sm font-semibold flex-shrink-0">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> New MOM
          </button>
        )}
      </div>
      <p className="text-sm text-slate mb-4 flex-shrink-0">Formal minutes — locked once the client approves.</p>

      {adding && <div className="mb-2.5 flex-shrink-0"><MomForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></div>}

      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-0">
        {sorted.length === 0 && !adding && <p className="text-sm text-slate-light italic">No MOM entries yet.</p>}

        {sorted.map((entry) =>
          editingId === entry.id ? (
            <MomForm key={entry.id} draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} />
          ) : (
            <div key={entry.id} className="bg-white border border-line rounded-lg px-4 py-3.5 text-sm">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 text-xs min-w-0">
                  <MomStatusBadge status={entry.status} />
                  {entry.date && <span className="text-slate-light flex-shrink-0">{entry.date}</span>}
                  {entry.meetingLink && (
                    <a href={entry.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal hover:underline flex-shrink-0">
                      <Video className="w-3 h-3" strokeWidth={2} /> Meeting
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canManage && entry.status === MOM_STATUS.DRAFT && (
                    <button
                      onClick={() => onSubmit?.(entry.id)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-signal text-white hover:bg-signal-dark"
                    >
                      Submit for approval
                    </button>
                  )}
                  {canManage && entry.status !== MOM_STATUS.APPROVED && (
                    <>
                      <button onClick={() => startEdit(entry)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                      <button onClick={() => onDelete?.(entry.id)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    </>
                  )}
                  {isClient && entry.status === MOM_STATUS.PENDING && (
                    <button
                      onClick={() => onApprove?.(entry.id)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-progress text-white hover:bg-progress/90 flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3" strokeWidth={2} /> Approve
                    </button>
                  )}
                </div>
              </div>
              <TruncatedText text={entry.text} />
              {entry.status === MOM_STATUS.APPROVED && entry.approvedByName && (
                <p className="text-[11px] text-slate-light mt-1.5">Approved by {entry.approvedByName}</p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function MomForm({ draft, setDraft, onSave, onCancel }) {
  return (
    <div className="border border-signal/40 rounded-lg px-3 py-2.5 bg-signal-light/30 space-y-2">
      <textarea
        autoFocus
        value={draft.text}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        rows={3}
        placeholder="Minutes of meeting — decisions, action items…"
        className="w-full border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal resize-none bg-white"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={draft.date || ''}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          className="border border-line rounded-lg px-2 py-1.5 text-sm outline-none focus:border-signal bg-white"
        />
        <input
          placeholder="Meeting link — optional"
          value={draft.meetingLink || ''}
          onChange={(e) => setDraft({ ...draft, meetingLink: e.target.value })}
          className="flex-1 border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-white"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-ink text-paper hover:bg-ink/90 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
      </div>
    </div>
  )
}

function MomStatusBadge({ status }) {
  const cls = {
    [MOM_STATUS.DRAFT]: 'bg-paper text-slate',
    [MOM_STATUS.PENDING]: 'bg-amber-light text-amber',
    [MOM_STATUS.APPROVED]: 'bg-progress-light text-progress',
  }[status] || 'bg-paper text-slate'
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cls}`}>{MOM_STATUS_LABELS[status] || status}</span>
}

function TruncatedText({ text }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = (text || '').length > 220 || (text || '').split('\n').length > 3

  return (
    <div>
      <p className={`text-ink whitespace-pre-wrap leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>{text}</p>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-signal hover:text-signal-dark text-xs font-medium mt-1 flex items-center gap-0.5"
        >
          {expanded ? <>Show less <ChevronUp className="w-3 h-3" /></> : <>Show more <ChevronDown className="w-3 h-3" /></>}
        </button>
      )}
    </div>
  )
}

function DocumentLinks({ links, editable, onChange, logAction, stageId }) {
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(null)

  function startAdd() {
    setDraft(newLink())
    setAdding(true)
    setEditingId(null)
  }
  function startEdit(link) {
    setDraft({ ...link })
    setEditingId(link.id)
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
      onChange([...(links || []), finalDraft])
      logAction?.(AUDIT_ACTIONS.DOC_ADDED, `Added link "${finalDraft.label}"`, stageId)
    } else {
      onChange((links || []).map((l) => (l.id === finalDraft.id ? finalDraft : l)))
      logAction?.(AUDIT_ACTIONS.DOC_EDITED, `Edited link "${finalDraft.label}"`, stageId)
    }
    cancelDraft()
  }
  function removeLink(link) {
    onChange((links || []).filter((l) => l.id !== link.id))
    logAction?.(AUDIT_ACTIONS.DOC_REMOVED, `Removed link "${link.label}"`, stageId)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate">Documents &amp; Links</span>
        {editable && !adding && (
          <button onClick={startAdd} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Add link
          </button>
        )}
      </div>

      <ul className="space-y-1.5">
        {(links || []).length === 0 && !adding && <li className="text-sm text-slate-light italic">No links added.</li>}

        {(links || []).map((link) =>
          editingId === link.id ? (
            <li key={link.id}><LinkForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></li>
          ) : (
            <li key={link.id} className="flex items-center justify-between gap-2 text-sm border border-transparent hover:border-line rounded-lg px-1.5 py-1 -mx-1.5">
              <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-signal hover:underline truncate min-w-0">
                <LinkTypeIcon type={link.type} className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{link.label}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" strokeWidth={2} />
              </a>
              {editable && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(link)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                  <button onClick={() => removeLink(link)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                </div>
              )}
            </li>
          )
        )}

        {adding && <li><LinkForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></li>}
      </ul>
    </div>
  )
}

function LinkForm({ draft, setDraft, onSave, onCancel }) {
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
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-white"
      />
      <div className="flex gap-2">
        <input
          placeholder="Label (e.g. Homepage design)"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          className="flex-1 border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-white"
        />
        <select
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value })}
          className="border border-line rounded-lg px-2 py-1.5 text-sm outline-none focus:border-signal bg-white"
        >
          {LINK_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-ink text-paper hover:bg-ink/90 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    [STATUS.DONE]: ['Done', 'bg-progress/10 text-progress border-progress/20'],
    [STATUS.IN_PROGRESS]: ['In progress', 'bg-signal-light text-signal border-signal/20'],
    [STATUS.PENDING]: ['Pending', 'bg-paper text-slate border-line'],
  }
  const [text, cls] = map[status] || map[STATUS.PENDING]
  return <span className={`inline-flex items-center text-xs font-medium px-3 py-1 rounded-full border ${cls}`}>{text}</span>
}

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function getDaysLeft(dueDate) {
  if (!dueDate) return null
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24))
  return diff
}
