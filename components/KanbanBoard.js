'use client'

import { useState } from 'react'
import { Plus, LayoutGrid } from 'lucide-react'
import TaskCard from '@/components/TaskCard'
import ProgressBar from '@/components/ProgressBar'
import { TASK_STATUS_COLUMNS, subtaskProgress } from '@/lib/tasks'

// Renders one stage's board. `tasks` are already filtered to this stage's
// top-level tasks (parentTaskId == null) by the caller; subtasks never
// appear here as their own cards — subtaskCountByParent supplies each
// parent card's "X of Y subtasks done" secondary indicator.
export default function KanbanBoard({
  tasks,
  subtasksByParent,
  priorityLibrary,
  assignees,
  canManage,
  onOpenTask,
  onCreateTask,
  onMoveTask,
}) {
  const [dragTaskId, setDragTaskId] = useState(null)

  const done = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  function handleDragStart(e, task) {
    setDragTaskId(task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e, columnId) {
    e.preventDefault()
    if (dragTaskId) onMoveTask(dragTaskId, columnId)
    setDragTaskId(null)
  }

  return (
    <div className="bg-surface/90 backdrop-blur border border-line rounded-card shadow-card p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-[18px] h-[18px] text-ink" strokeWidth={1.75} />
          <span className="font-display text-xl font-semibold text-ink uppercase tracking-wide">Sprint board</span>
        </div>
        {canManage && (
          <button
            onClick={() => onCreateTask(TASK_STATUS_COLUMNS[0].id)}
            className="text-ink hover:text-signal flex items-center gap-1 text-sm font-semibold"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> New task
          </button>
        )}
      </div>

      {total > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="text-slate font-semibold uppercase tracking-wide">{done} of {total} tasks done</span>
            <span className="text-progress font-bold">{pct}%</span>
          </div>
          <ProgressBar pct={pct} className="h-2" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TASK_STATUS_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id)
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.id)}
              className="bg-paper/60 border border-line rounded-lg p-3 min-h-[120px]"
            >
              <div className="flex items-center justify-between mb-3 px-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate">{col.name}</span>
                <span className="text-xs text-slate-light">{colTasks.length}</span>
              </div>
              <div className="space-y-2.5">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    priorityLibrary={priorityLibrary}
                    assignees={assignees}
                    subtaskCount={subtaskProgress(subtasksByParent[task.id])}
                    onClick={() => onOpenTask(task)}
                    draggable={canManage}
                    onDragStart={handleDragStart}
                  />
                ))}
                {colTasks.length === 0 && (
                  <p className="text-xs text-slate-light italic px-1 py-1">No tasks.</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
