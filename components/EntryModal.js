'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function EntryModal({ open, onClose, title, meta, children }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !mounted) return null

  // Rendered via portal directly under <body> — several ancestors in this
  // app use backdrop-blur/filter, which creates a CSS containing block that
  // traps position:fixed descendants instead of the viewport. Portaling out
  // of that subtree is what makes `fixed inset-0` actually cover the screen.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-card shadow-card border border-line max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-line flex-shrink-0">
          <div className="min-w-0">
            <h4 className="font-display text-lg font-semibold text-ink truncate">{title}</h4>
            {meta && <div className="text-xs text-slate mt-1 flex items-center gap-2 flex-wrap">{meta}</div>}
          </div>
          <button onClick={onClose} className="text-slate-light hover:text-ink flex-shrink-0">
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto text-sm text-ink whitespace-pre-wrap break-words leading-relaxed">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
