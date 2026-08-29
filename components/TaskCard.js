'use client'

import PriorityBadge from '@/components/PriorityBadge'
import { AssigneeStack } from '@/components/AssigneeSelect'
import { OverdueBadge } from '@/components/TaskTimer'
import { resolvePriority } from '@/lib/priorityLibrary'

// The four reserved priority IDs map to the app's own design tokens (the
// same coral/amber/signal/slate used for status badges elsewhere) so cards
// read as one system. A company-customized priority (a 5th tier, or one of
// the four renamed/recolored) falls back to its own configured hex color
// via inline style instead — see accentStyle below.
const RESERVED_ACCENT = {
  critical: { border: 'border-l-coral', tint: 'bg-coral-light/40' },
  high: { border: 'border-l-amber', tint: 'bg-amber-light/40' },
  medium: { border: 'border-l-signal', tint: 'bg-signal-light/40' },
  low: { border: 'border-l-slate', tint: 'bg-slate-light/30' },
}

export default function TaskCard({ task, priorityLibrary, assignees, subtaskCount, onClick, draggable, onDragStart }) {
  const priority = resolvePriority(task.priorityId, priorityLibrary)
  const reserved = RESERVED_ACCENT[priority.id]

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart(e, task) : undefined}
      onClick={onClick}
      style={reserved ? undefined : { borderLeftColor: priority.color, backgroundColor: `${priority.color}0d` }}
      className={[
        'bg-surface border border-line rounded-lg px-3.5 py-3 text-sm cursor-pointer hover:border-ink/25 hover:shadow-card transition-all border-l-4',
        reserved && reserved.border,
        reserved && reserved.tint,
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
