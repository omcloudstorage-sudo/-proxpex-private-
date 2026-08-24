'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Generic large modal shell used by the Resources, Documents, and MOM cards
// on the project page — each card is a small trigger, its content opens here
// instead of expanding inline. Portaled directly under <body> for the same
// reason as EntryModal (backdrop-blur ancestors trap position:fixed).
export default function Modal({ open, onClose, icon: Icon, title, children }) {
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

  // Lock background scroll while open — only this modal's own body scrolls.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-card shadow-card border border-line w-[95vw] max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="w-5 h-5 text-ink flex-shrink-0" strokeWidth={1.75} />}
            <h4 className="font-display text-lg font-semibold text-ink truncate">{title}</h4>
          </div>
          <button onClick={onClose} className="text-slate-light hover:text-ink flex-shrink-0">
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  )
}
