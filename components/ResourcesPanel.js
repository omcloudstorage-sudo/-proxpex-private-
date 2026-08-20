'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ClipboardList, X } from 'lucide-react'
import ResourcesTable from '@/components/ResourcesTable'
import { normalizeSections } from '@/lib/resources'

export default function ResourcesPanel({ resources, onChange, canManage, logAction }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const sections = useMemo(() => normalizeSections(resources), [resources])
  const totalItems = sections.reduce((n, s) => n + s.items.length, 0)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div>
      <button onClick={() => setOpen(true)} className="w-full flex items-center justify-between text-left group">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-ink" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate">Resources & Credentials</span>
        </div>
        <span className="text-[11px] text-slate-light group-hover:text-ink flex-shrink-0">
          {totalItems ? `${totalItems} item${totalItems === 1 ? '' : 's'}` : 'Open'}
        </span>
      </button>
      {totalItems === 0 && <p className="text-sm text-slate-light italic mt-1.5">No resources added.</p>}

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-surface rounded-card shadow-card border border-line w-[95vw] max-w-6xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line flex-shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-ink" strokeWidth={1.75} />
                <h4 className="font-display text-lg font-semibold text-ink">Project Resources & Credentials</h4>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-light hover:text-ink">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-auto flex-1">
              <ResourcesTable sections={sections} onChange={onChange} canManage={canManage} logAction={logAction} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
