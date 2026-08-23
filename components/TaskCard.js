'use client'

import PriorityBadge from '@/components/PriorityBadge'
import { AssigneeStack } from '@/components/AssigneeSelect'
import { OverdueBadge } from '@/components/TaskTimer'

export default function TaskCard({ task, priorityLibrary, assignees, subtaskCount, onClick, draggable, onDragStart }) {
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart(e, task) : undefined}
      onClick={onClick}
      className={[
        'bg-surface border border-line rounded-lg px-3.5 py-3 text-sm cursor-pointer hover:border-ink/25 hover:shadow-card transition-all',
        draggable && 'active:cursor-grabbing',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-ink leading-snug break-words line-clamp-2">{task.title || 'Untitled task'}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        <PriorityBadge priorityId={task.priorityId} library={priorityLibrary} />
        <OverdueBadge task={task} />
        {subtaskCount.total > 0 && (
          <SubtaskCountBadge subtaskCount={subtaskCount} />
        )}
      </div>
      <div className="flex items-center justify-between">
        <AssigneeStack assigneeIds={task.assigneeIds} assignees={assignees} />
      </div>
    </div>
  )
}

function SubtaskCountBadge({ subtaskCount }) {
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-paper text-slate flex-shrink-0">
      {subtaskCount.done} of {subtaskCount.total} subtasks
    </span>
  )
}
