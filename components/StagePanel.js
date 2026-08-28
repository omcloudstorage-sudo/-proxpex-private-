'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, Check, X, Video, ShieldCheck, ClipboardList } from 'lucide-react'
import { normalizeStage } from '@/lib/stages'
import { MOM_STATUS, MOM_STATUS_LABELS } from '@/lib/momEntries'
import { getStatusDisplay, resolveStatusKind, STATUS_KIND_OPTIONS, STATUS_KINDS } from '@/lib/statusLibrary'
import { AUDIT_ACTIONS } from '@/lib/auditLog'
import EntryModal from '@/components/EntryModal'
import PulseDot from '@/components/PulseDot'
import InvoicesPanel from '@/components/InvoicesPanel'

// `bare` drops the outer card chrome (and the "select a stage" empty-state
// card) so the parent — the stage-tracker card on the project page — can
// render this content inline instead of as its own separate section.
export default function StagePanel({
  stage,
  canManage,
  currentUser,
  onChange,
  logAction,
  statusOptions,
  onAddStatus,
  maxStatuses,
  projectId,
  bare = false,
}) {
  const [local, setLocal] = useState(stage ? normalizeStage(stage) : null)

  useEffect(() => setLocal(stage ? normalizeStage(stage) : null), [stage])

  if (!local) {
    if (bare) return null
    return (
      <div className="bg-surface/90 backdrop-blur border border-line rounded-card shadow-card p-8 text-center text-slate text-sm">
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
    const label = getStatusDisplay(status, statusOptions).name
    logAction?.(AUDIT_ACTIONS.STAGE_STATUS_CHANGED, `Changed "${local.name}" status to ${label}`, local.id)
    const kind = resolveStatusKind(status, statusOptions)
    if (kind === STATUS_KINDS.DONE) {
      commit({ status, completedAt: local.completedAt || new Date().toISOString() })
    } else {
      commit({ status, completedAt: null })
    }
  }

  function changeDueDate(dueDate) {
    logAction?.(AUDIT_ACTIONS.STAGE_DATE_CHANGED, `Set "${local.name}" next milestone to ${dueDate || '—'}`, local.id)
    commit({ dueDate })
  }

  const daysLeft = getDaysLeft(local.dueDate)
  const isDone = resolveStatusKind(local.status, statusOptions) === STATUS_KINDS.DONE

  // Compact single-row variant — name, status, and next milestone all inline
  // — used above the stage-tracker breadcrumb where space is at a premium
  // (the main goal on this screen is reaching the Sprint Board quickly).
  if (bare) {
    return (
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {canManage ? (
            <input
              value={local.name}
              onChange={(e) => commit({ name: e.target.value })}
              className="font-display text-lg font-semibold text-ink tracking-tight bg-transparent outline-none border-b border-transparent focus:border-line -ml-0.5 px-0.5 min-w-0"
            />
          ) : (
            <h3 className="font-display text-lg font-semibold text-ink tracking-tight truncate">{local.name}</h3>
          )}
          <StatusBadge status={local.status} statusOptions={statusOptions} />
        </div>

        <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
          {canManage && (
            <div className="relative flex items-center gap-1.5">
              <select
                value={local.status}
                onChange={(e) => changeStatus(e.target.value)}
                className="text-xs bg-paper border border-line rounded-lg px-2.5 py-1.5 font-medium text-ink outline-none focus:border-signal"
              >
                {(statusOptions || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {onAddStatus && <AddStatusButton onAdd={onAddStatus} disabled={(statusOptions || []).length >= (maxStatuses || Infinity)} maxStatuses={maxStatuses} />}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium uppercase tracking-wide text-slate-light">Next milestone</span>
            {isDone ? (
              <span className="inline-flex items-center gap-1 font-medium text-progress">
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                Completed{local.completedAt ? ` ${formatDate(local.completedAt)}` : ''}
              </span>
            ) : canManage ? (
              <input
                type="date"
                value={local.dueDate || ''}
                onChange={(e) => changeDueDate(e.target.value)}
                className="bg-surface border border-line rounded-lg px-2 py-1 text-xs text-ink outline-none focus:border-signal"
              />
            ) : (
              <span className="text-ink">{local.dueDate || '—'}</span>
            )}
          </div>

          {!isDone && daysLeft !== null && (
            <span
              className={[
                'text-[11px] font-medium px-2.5 py-1 rounded-full border flex-shrink-0',
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
    )
  }

  const inner = (
    <>
      <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            {canManage ? (
              <input
                value={local.name}
                onChange={(e) => commit({ name: e.target.value })}
                className="font-display text-[28px] font-semibold text-ink tracking-tight bg-transparent outline-none border-b border-transparent focus:border-line -ml-0.5 px-0.5"
              />
            ) : (
              <h3 className="font-display text-[28px] font-semibold text-ink tracking-tight">{local.name}</h3>
            )}
            <StatusBadge status={local.status} statusOptions={statusOptions} />
          </div>

          {canManage && (
            <div className="relative flex items-center gap-1.5">
              <select
                value={local.status}
                onChange={(e) => changeStatus(e.target.value)}
                className="text-sm bg-paper border border-line rounded-lg px-3 py-2 font-medium text-ink outline-none focus:border-signal"
              >
                {(statusOptions || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {onAddStatus && <AddStatusButton onAdd={onAddStatus} disabled={(statusOptions || []).length >= (maxStatuses || Infinity)} maxStatuses={maxStatuses} />}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-line flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">Next milestone</span>
            {isDone ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-progress">
                <Check className="w-4 h-4" strokeWidth={2.5} />
                Completed{local.completedAt ? ` ${formatDate(local.completedAt)}` : ''}
              </span>
            ) : canManage ? (
              <input
                type="date"
                value={local.dueDate || ''}
                onChange={(e) => changeDueDate(e.target.value)}
                className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-signal"
              />
            ) : (
              <span className="text-sm text-ink">{local.dueDate || '—'}</span>
            )}
          </div>
          {!isDone && daysLeft !== null && (
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
    </>
  )

  return (
    <div className="space-y-6">
      <div className="card-hover bg-surface/90 backdrop-blur border border-line rounded-card shadow-card p-6 md:p-7">
        {inner}
      </div>

      <InvoicesPanel
        invoices={local.invoices}
        canManage={canManage}
        onChange={(invoices) => commit({ invoices })}
        logAction={logAction}
        stageName={local.name}
        projectId={projectId}
      />
    </div>
  )
}

// Rendered by the project page as its own collapsible section (not inside
// the stage header card) — see app/project/[id]/page.js.
export function MomPanel({ entries, canManage, currentUser, onCreate, onUpdate, onDelete, onApprove, onSubmit, startInAdd = false }) {
  const [adding, setAdding] = useState(startInAdd)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(startInAdd ? { text: '', meetingLink: '', date: '' } : null)
  const [openEntry, setOpenEntry] = useState(null)

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
        {sorted.length === 0 && !adding && (
          <p className="text-sm text-slate-light italic">
            No MOM entries yet{canManage ? ' — create one to keep formal minutes here.' : '.'}
          </p>
        )}

        {sorted.map((entry) =>
          editingId === entry.id ? (
            <MomForm key={entry.id} draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} />
          ) : (
            <div
              key={entry.id}
              onClick={() => setOpenEntry(entry)}
              className="bg-surface border border-line rounded-lg px-4 py-3.5 text-sm cursor-pointer hover:border-ink/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 text-xs min-w-0">
                  <MomStatusBadge status={entry.status} />
                  {entry.date && <span className="text-slate-light flex-shrink-0">{entry.date}</span>}
                  {entry.meetingLink && (
                    <a href={entry.meetingLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-signal hover:underline flex-shrink-0">
                      <Video className="w-3 h-3" strokeWidth={2} /> Meeting
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
              <p className="text-ink whitespace-pre-wrap break-words leading-relaxed line-clamp-2">{entry.text}</p>
              {entry.status === MOM_STATUS.APPROVED && entry.approvedByName && (
                <p className="text-[11px] text-slate-light mt-1.5">Approved by {entry.approvedByName}</p>
              )}
            </div>
          )
        )}
      </div>

      <EntryModal
        open={!!openEntry}
        onClose={() => setOpenEntry(null)}
        title="Minutes of Meeting"
        meta={openEntry && (
          <>
            <MomStatusBadge status={openEntry.status} />
            {openEntry.date && <span>{openEntry.date}</span>}
            {openEntry.meetingLink && (
              <a href={openEntry.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal hover:underline">
                <Video className="w-3 h-3" strokeWidth={2} /> Meeting
              </a>
            )}
          </>
        )}
      >
        {openEntry?.text}
        {openEntry?.status === MOM_STATUS.APPROVED && openEntry?.approvedByName && (
          <p className="text-xs text-slate-light mt-3">Approved by {openEntry.approvedByName}</p>
        )}
      </EntryModal>
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
        className="w-full border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal resize-none bg-surface"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={draft.date || ''}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          className="border border-line rounded-lg px-2 py-1.5 text-sm outline-none focus:border-signal bg-surface"
        />
        <input
          placeholder="Meeting link — optional"
          value={draft.meetingLink || ''}
          onChange={(e) => setDraft({ ...draft, meetingLink: e.target.value })}
          className="flex-1 border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
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

function StatusBadge({ status, statusOptions }) {
  const display = getStatusDisplay(status, statusOptions)
  const isLive = resolveStatusKind(status, statusOptions) === STATUS_KINDS.IN_PROGRESS
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border"
      style={{ background: `${display.color}1a`, color: display.color, borderColor: `${display.color}33` }}
    >
      {isLive && <PulseDot color={display.color} />}
      {display.name}
    </span>
  )
}

// Adds a status scoped to this project only (see onAddStatus in the project
// page) — never written to the company's shared Settings status library.
function AddStatusButton({ onAdd, disabled, maxStatuses }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#2563eb')
  const [kind, setKind] = useState(STATUS_KIND_OPTIONS[0]?.value)

  function reset() {
    setOpen(false)
    setName('')
    setColor('#2563eb')
    setKind(STATUS_KIND_OPTIONS[0]?.value)
  }

  function add() {
    if (!name.trim()) return
    onAdd({ name, color, kind })
    reset()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? `Up to ${maxStatuses} statuses per project` : 'Add a status just for this project'}
        className="text-slate-light hover:text-signal disabled:opacity-30 disabled:hover:text-slate-light flex-shrink-0"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
      </button>
    )
  }

  return (
    <div className="absolute z-10 mt-2 right-0 top-full bg-surface border border-line rounded-lg shadow-card p-3 space-y-2 w-56">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Status name"
        className="w-full border border-line rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      />
      <div className="flex gap-2">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 border border-line rounded-lg bg-surface p-1 flex-shrink-0" />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="flex-1 border border-line rounded-lg px-2 py-1.5 text-xs outline-none focus:border-signal bg-surface min-w-0"
        >
          {STATUS_KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={reset} className="text-xs font-medium px-2 py-1 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /></button>
        <button onClick={add} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Add</button>
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

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDaysLeft(dueDate) {
  if (!dueDate) return null
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24))
  return diff
}
