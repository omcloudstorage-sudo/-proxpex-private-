'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Check } from 'lucide-react'
import PriorityBadge from '@/components/PriorityBadge'
import AssigneeSelect, { AssigneeAvatar } from '@/components/AssigneeSelect'
import TaskTimer, { OverdueBadge } from '@/components/TaskTimer'
import CommentsThread from '@/components/CommentsThread'
import { useTaskComments } from '@/lib/useTaskComments'
import { sortedPriorities } from '@/lib/priorityLibrary'
import { TASK_STATUS_COLUMNS, TASK_STATUS, isSubtask, subtaskProgress } from '@/lib/tasks'

// One recursive component renders both a task and its subtasks' own detail
// views — a subtask is just a task with parentTaskId set, so this same
// component opens itself one level deep for a clicked subtask row. The
// "+ Add subtask" control is hidden whenever isSubtask(task) is true,
// enforcing the one-level-deep rule in the UI (firestore.rules enforces
// the same rule server-side).
export default function TaskDetailModal({
  projectId,
  task,
  allTasks,
  priorityLibrary,
  assignees,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div
        className="bg-surface rounded-card shadow-card border border-line w-[95vw] max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-line flex-shrink-0">
          <div className="min-w-0 flex-1">
            {isSubtask(task) && <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-light mb-1">Subtask</p>}
            {editingTitle && canManage ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                className="font-display text-lg font-semibold text-ink bg-transparent outline-none border-b border-line w-full"
              />
            ) : (
              <h4
                className={`font-display text-lg font-semibold text-ink truncate ${canManage ? 'cursor-text' : ''}`}
                onClick={() => canManage && setEditingTitle(true)}
              >
                {task.title || 'Untitled task'}
              </h4>
            )}
          </div>
          <button onClick={onClose} className="text-slate-light hover:text-ink flex-shrink-0">
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            {canManage ? (
              <select
                value={task.priorityId}
                onChange={(e) => onUpdate(task.id, { priorityId: e.target.value })}
                className="text-xs bg-paper border border-line rounded-full px-2.5 py-1 font-medium text-ink outline-none focus:border-signal"
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
                className="text-xs bg-paper border border-line rounded-full px-2.5 py-1 font-medium text-ink outline-none focus:border-signal"
              >
                {TASK_STATUS_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-paper text-slate">
                {TASK_STATUS_COLUMNS.find((c) => c.id === task.status)?.name || task.status}
              </span>
            )}

            <OverdueBadge task={task} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Assignee</p>
            <AssigneeSelect
              assigneeIds={task.assigneeIds}
              assignees={assignees}
              onChange={(ids) => onUpdate(task.id, { assigneeIds: ids })}
              disabled={!canManage}
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Deadline</p>
            <TaskTimer
              task={task}
              canSetTimer={(task.assigneeIds || []).includes(currentUser.uid)}
              onSetTimer={(iso) => onUpdate(task.id, { timerDeadline: iso })}
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">Description</p>
            {canManage ? (
              <textarea
                rows={3}
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={saveDescription}
                placeholder="Describe this task…"
                className="w-full border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal resize-none bg-paper"
              />
            ) : (
              <p className="text-sm text-ink whitespace-pre-wrap break-words">{task.description || '—'}</p>
            )}
          </div>

          {!isSubtask(task) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                  Subtasks{progress.total > 0 && ` — ${progress.done} of ${progress.total} done`}
                </p>
                {canManage && (
                  <button onClick={addSubtask} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium">
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add subtask
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {subtasks.length === 0 && <p className="text-sm text-slate-light italic">No subtasks yet.</p>}
                {subtasks.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setOpenSubtaskId(st.id)}
                    className="w-full flex items-center gap-2.5 border border-line rounded-lg px-3 py-2 text-sm hover:border-ink/25 text-left"
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
          )}

          <div className="pt-1 border-t border-line">
            <CommentsThread
              comments={comments}
              canPost
              onPost={(text) => { postComment(task.id, text, currentUser); onCommentLogged?.(task) }}
            />
          </div>

          {canManage && (
            <button
              onClick={() => { onDelete(task.id); onClose() }}
              className="text-xs font-medium text-coral hover:text-coral/80"
            >
              Delete {isSubtask(task) ? 'subtask' : 'task'}
            </button>
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
