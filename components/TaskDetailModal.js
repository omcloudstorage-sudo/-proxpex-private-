'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Check, ListChecks, MessageCircle } from 'lucide-react'
import PriorityBadge from '@/components/PriorityBadge'
import AssigneeSelect, { AssigneeAvatar } from '@/components/AssigneeSelect'
import TaskTimer, { OverdueBadge } from '@/components/TaskTimer'
import CommentsThread from '@/components/CommentsThread'
import { useTaskComments } from '@/lib/useTaskComments'
import { sortedPriorities } from '@/lib/priorityLibrary'
import { TASK_STATUS, isSubtask, subtaskProgress } from '@/lib/tasks'

// One recursive component renders both a task and its subtasks' own detail
// views — a subtask is just a task with parentTaskId set, so this same
// component opens itself one level deep for a clicked subtask row, as a
// separate portal stacked on top of the parent's (never inline expansion).
// The "+ Add subtask" control is hidden whenever isSubtask(task) is true,
// enforcing the one-level-deep rule in the UI (firestore.rules enforces
// the same rule server-side). `columns` is the company's Kanban column
// library (see lib/kanbanColumns.js), passed down from the project page.
export default function TaskDetailModal({
  projectId,
  task,
  allTasks,
  priorityLibrary,
  assignees,
  columns,
  currentUser,
  canManage,
  onClose,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onCommentLogged,
}) {
  const [mounted, setMounted] = useState(false)
  const [openSubtaskId, setOpenSubtaskId] = useState(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [descDraft, setDescDraft] = useState(task.description || '')
  const { comments, postComment } = useTaskComments(projectId, task.id)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!openSubtaskId) return
    function onKey(e) {
      if (e.key === 'Escape') setOpenSubtaskId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openSubtaskId])
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !openSubtaskId) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, openSubtaskId])

  if (!mounted) return null

  const subtasks = isSubtask(task) ? [] : allTasks.filter((t) => t.parentTaskId === task.id)
  const progress = subtaskProgress(subtasks)
  const openSubtask = openSubtaskId ? allTasks.find((t) => t.id === openSubtaskId) : null

  function saveTitle() {
    if (titleDraft.trim() && titleDraft !== task.title) onUpdate(task.id, { title: titleDraft.trim() })
    setEditingTitle(false)
  }

  function saveDescription() {
    if (descDraft !== task.description) onUpdate(task.id, { description: descDraft })
  }

  async function addSubtask() {
    const newId = await onCreateSubtask(task.id)
    if (newId) setOpenSubtaskId(newId)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 lg:p-10" onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div
        className="bg-surface rounded-card shadow-card border border-line w-full h-full max-w-6xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-6 sm:py-7">
          <div className="bg-paper/40 border border-line rounded-card p-6 sm:p-7 mb-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0 flex-1">
                {isSubtask(task) && <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-light mb-1.5">Subtask</p>}
                {editingTitle && canManage ? (
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                    className="font-display text-2xl sm:text-3xl font-bold text-ink bg-transparent outline-none border-b border-line w-full tracking-tight"
                  />
                ) : (
                  <h4
                    className={`font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight break-words ${canManage ? 'cursor-text' : ''}`}
                    onClick={() => canManage && setEditingTitle(true)}
                  >
                    {task.title || 'Untitled task'}
                  </h4>
                )}
              </div>
              <button onClick={onClose} className="text-slate-light hover:text-ink flex-shrink-0">
                <X className="w-6 h-6" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap pb-5 mb-5 border-b border-line">
              {canManage ? (
                <select
                  value={task.priorityId}
                  onChange={(e) => onUpdate(task.id, { priorityId: e.target.value })}
                  className="text-xs bg-surface border border-line rounded-full px-2.5 py-1 font-medium text-ink outline-none focus:border-signal"
                >
                  {sortedPriorities(priorityLibrary).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <PriorityBadge priorityId={task.priorityId} library={priorityLibrary} />
              )}

              {canManage ? (
                <select
                  value={task.status}
                  onChange={(e) => onUpdate(task.id, { status: e.target.value })}
                  className="text-xs bg-surface border border-line rounded-full px-2.5 py-1 font-medium text-ink outline-none focus:border-signal"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-paper text-slate">
                  {columns.find((c) => c.id === task.status)?.name || task.status}
                </span>
              )}

              <OverdueBadge task={task} />

              {canManage && (
                <button
                  onClick={() => { onDelete(task.id); onClose() }}
                  className="ml-auto text-xs font-medium text-coral hover:text-coral/80"
                >
                  Delete {isSubtask(task) ? 'subtask' : 'task'}
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-6 pb-6 mb-6 border-b border-line">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-light mb-2">Assignee</p>
                <AssigneeSelect
                  assigneeIds={task.assigneeIds}
                  assignees={assignees}
                  onChange={(ids) => onUpdate(task.id, { assigneeIds: ids })}
                  disabled={!canManage}
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-light mb-2">Deadline</p>
                <TaskTimer
                  task={task}
                  canSetTimer={(task.assigneeIds || []).includes(currentUser.uid)}
                  onSetTimer={(iso) => onUpdate(task.id, { timerDeadline: iso })}
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-light mb-2">Description</p>
              {canManage ? (
                <textarea
                  rows={6}
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={saveDescription}
                  placeholder="Describe this task…"
                  className="w-full min-h-[160px] border border-line rounded-lg px-4 py-3 text-sm outline-none focus:border-signal resize-y bg-surface"
                />
              ) : (
                <p className="min-h-[100px] text-sm text-ink whitespace-pre-wrap break-words bg-surface border border-line rounded-lg px-4 py-3">{task.description || '—'}</p>
              )}
            </div>
          </div>

          {!isSubtask(task) && (
            <div className="grid lg:grid-cols-2 gap-5 items-stretch">
              <div className="bg-paper/40 border border-line rounded-card flex flex-col h-[420px]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <ListChecks className="w-4 h-4 text-ink flex-shrink-0" strokeWidth={1.75} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate truncate">
                      Subtasks{progress.total > 0 && ` — ${progress.done} of ${progress.total} done`}
                    </span>
                  </div>
                  {canManage && (
                    <button onClick={addSubtask} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium flex-shrink-0">
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add subtask
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                  {subtasks.length === 0 && <p className="text-sm text-slate-light italic px-1">No subtasks yet.</p>}
                  {subtasks.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setOpenSubtaskId(st.id)}
                      className="w-full flex items-center gap-2.5 border border-line bg-surface rounded-lg px-3 py-2.5 text-sm hover:border-ink/25 text-left"
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${st.status === TASK_STATUS.DONE ? 'bg-progress border-progress text-white' : 'border-line'}`}>
                        {st.status === TASK_STATUS.DONE && <Check className="w-3 h-3" strokeWidth={3} />}
                      </span>
                      <span className="flex-1 truncate text-ink">{st.title || 'Untitled subtask'}</span>
                      <PriorityBadge priorityId={st.priorityId} library={priorityLibrary} />
                      <OverdueBadge task={st} />
                      <AssigneeAvatar name={assignees.find((a) => (st.assigneeIds || [])[0] === a.id)?.name || ''} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-paper/40 border border-line rounded-card flex flex-col h-[420px]">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-line flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-ink" strokeWidth={1.75} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate">Comments</span>
                </div>
                <div className="flex-1 min-h-0">
                  <CommentsThread
                    comments={comments}
                    canPost
                    onPost={(text) => { postComment(task.id, text, currentUser); onCommentLogged?.(task) }}
                    hideHeader
                    fill
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {openSubtask && (
        <TaskDetailModal
          projectId={projectId}
          task={openSubtask}
          allTasks={allTasks}
          priorityLibrary={priorityLibrary}
          assignees={assignees}
          columns={columns}
          currentUser={currentUser}
          canManage={canManage}
          onClose={() => setOpenSubtaskId(null)}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCreateSubtask={onCreateSubtask}
          onCommentLogged={onCommentLogged}
        />
      )}
    </div>,
    document.body
  )
}
