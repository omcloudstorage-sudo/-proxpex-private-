'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// One consistent collapsible pattern for every secondary section on the
// project page (Requirements, Documents, MOM, Team Updates, Audit Log) —
// the Sprint Board is the only section that stays permanently expanded.
// Header styling matches the existing font-display uppercase title used by
// KanbanBoard/MomPanel so every section reads as one system.
export default function CollapsibleSection({ icon: Icon, title, summary, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    // overflow-hidden only while closed, purely to clip the header's own
    // corners. Once open, any dropdown/popover rendered inside `children`
    // (an assignee picker, a menu, etc.) must be able to escape this card's
    // bounds instead of being cut off at its edge — that clipping was the
    // real bug behind "expanded panels get covered": it wasn't a z-index
    // problem, an ancestor was silently cropping the popover before z-index
    // ever came into play.
    <div className={`bg-surface/90 backdrop-blur border border-line rounded-card shadow-card ${open ? '' : 'overflow-hidden'}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-6 py-5 text-left hover:bg-paper/40 transition-colors ${open ? 'rounded-t-card' : 'rounded-card'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-[18px] h-[18px] text-ink flex-shrink-0" strokeWidth={1.75} />}
          <span className="font-display text-xl font-semibold text-ink uppercase tracking-wide truncate">{title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {summary && <span className="text-xs font-medium text-slate-light">{summary}</span>}
          <ChevronDown className={`w-4 h-4 text-slate-light transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
        </div>
      </button>
      {open && <div className="px-6 pb-6 pt-1 border-t border-line rounded-b-card">{children}</div>}
    </div>
  )
}
