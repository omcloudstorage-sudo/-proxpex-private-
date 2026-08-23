'use client'

import { useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { isOverdue, TASK_STATUS } from '@/lib/tasks'

function formatDeadline(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function OverdueBadge({ task }) {
  if (!isOverdue(task)) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-coral-light text-coral flex-shrink-0">
      <AlertTriangle className="w-3 h-3" strokeWidth={2} /> Overdue
    </span>
  )
}

// Only the task's own assignee(s) may set/change the timer — a deadline the
// assignee commits to. Once it lapses without the task being marked Done,
// isOverdue() derives an "Overdue" badge everywhere the task is shown; no
// separate stored status, no scheduled job.
export default function TaskTimer({ task, canSetTimer, onSetTimer }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(task.timerDeadline ? task.timerDeadline.slice(0, 16) : '')

  function save() {
    if (!value) return setEditing(false)
    onSetTimer(new Date(value).toISOString())
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="datetime-local"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border border-line rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-signal bg-surface"
        />
        <button onClick={save} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark">Set</button>
        <button onClick={() => setEditing(false)} className="text-xs font-medium px-2 py-1.5 text-slate hover:text-ink">Cancel</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock className="w-4 h-4 text-slate-light flex-shrink-0" strokeWidth={1.75} />
      {task.timerDeadline ? (
        <span className={isOverdue(task) ? 'text-coral font-medium' : 'text-ink'}>{formatDeadline(task.timerDeadline)}</span>
      ) : (
        <span className="text-slate-light italic">No deadline set</span>
      )}
      {canSetTimer && task.status !== TASK_STATUS.DONE && (
        <button onClick={() => setEditing(true)} className="text-xs font-medium text-signal hover:text-signal-dark">
          {task.timerDeadline ? 'Change' : 'Set deadline'}
        </button>
      )}
    </div>
  )
}
