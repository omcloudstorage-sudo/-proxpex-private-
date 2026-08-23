'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

const AVATAR_TONES = ['bg-signal-light text-signal', 'bg-paper text-slate', 'bg-emerald-50 text-emerald-600', 'bg-amber-50 text-amber-600']

function toneFor(key) {
  let hash = 0
  for (const ch of key || '') hash = (hash + ch.charCodeAt(0)) % AVATAR_TONES.length
  return AVATAR_TONES[hash]
}

function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export function AssigneeAvatar({ name, size = 'sm' }) {
  const dim = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-sm'
  return (
    <div title={name} className={`${dim} rounded-full border-2 border-white shadow-card flex items-center justify-center flex-shrink-0 ${toneFor(name)}`}>
      {initials(name)}
    </div>
  )
}

export function AssigneeStack({ assigneeIds, assignees, size = 'sm' }) {
  const names = (assigneeIds || []).map((id) => assignees.find((a) => a.id === id)?.name || 'Unknown')
  if (names.length === 0) return <span className="text-xs text-slate-light italic">Unassigned</span>
  return (
    <div className="flex items-center -space-x-1.5">
      {names.map((name, i) => <AssigneeAvatar key={i} name={name} size={size} />)}
    </div>
  )
}

// Multi-select scoped to the project's PM + that PM's team members (see
// lib/useProjectTeam.js) — never company-wide.
export default function AssigneeSelect({ assigneeIds, assignees, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function toggle(id) {
    const set = new Set(assigneeIds || [])
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onChange([...set])
  }

  const selected = (assigneeIds || []).map((id) => assignees.find((a) => a.id === id)).filter(Boolean)

  if (disabled) {
    return <AssigneeStack assigneeIds={assigneeIds} assignees={assignees} />
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-line rounded-lg px-3 py-2 text-sm bg-surface hover:border-ink/30 min-w-[10rem]"
      >
        {selected.length === 0 ? (
          <span className="text-slate-light">Assign…</span>
        ) : (
          <div className="flex items-center -space-x-1.5">
            {selected.map((a) => <AssigneeAvatar key={a.id} name={a.name} />)}
          </div>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-slate-light ml-auto" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 left-0 bg-surface border border-line rounded-lg shadow-card w-56 max-h-64 overflow-y-auto py-1.5">
          {assignees.length === 0 && <p className="text-xs text-slate-light italic px-3 py-2">No one to assign yet.</p>}
          {assignees.map((a) => {
            const checked = (assigneeIds || []).includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-paper text-left"
              >
                <AssigneeAvatar name={a.name} />
                <span className="flex-1 truncate text-ink">{a.name}</span>
                {checked && <Check className="w-3.5 h-3.5 text-signal flex-shrink-0" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
