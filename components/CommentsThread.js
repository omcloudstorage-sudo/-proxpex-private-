'use client'

import { useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { AssigneeAvatar } from '@/components/AssigneeSelect'

function formatTimestamp(ts) {
  if (!ts) return 'just now'
  const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// Append-only, same trust pattern as the audit log and locked MOM entries —
// this component never offers edit/delete, and firestore.rules hard-blocks
// update/delete on the comments subcollection regardless of role.
//
// `hideHeader` + `fill` let a parent card (e.g. TaskDetailModal's Comments
// card) supply its own header and give this component the full remaining
// height with its own internal scroll, instead of the standalone
// self-contained block used elsewhere.
export default function CommentsThread({ comments, canPost, onPost, hideHeader = false, fill = false }) {
  const [text, setText] = useState('')
  const sorted = [...(comments || [])].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))

  function submit() {
    if (!text.trim()) return
    onPost(text.trim())
    setText('')
  }

  return (
    <div className={fill ? 'flex flex-col h-full min-h-0' : ''}>
      {!hideHeader && (
        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <MessageCircle className="w-4 h-4 text-ink" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate">Comments</span>
        </div>
      )}

      <div className={fill ? 'space-y-3 p-4 overflow-y-auto flex-1 min-h-0' : 'space-y-3 mb-3 max-h-56 overflow-y-auto pr-1'}>
        {sorted.length === 0 && <p className="text-sm text-slate-light italic">No comments yet.</p>}
        {sorted.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5">
            <AssigneeAvatar name={c.authorName} />
            <div className="min-w-0 flex-1 bg-surface border border-line rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-slate mb-0.5">
                <span className="font-semibold text-ink">{c.authorName || 'Unknown'}</span>
                <span className="text-slate-light">{formatTimestamp(c.createdAt)}</span>
              </div>
              <p className="text-sm text-ink whitespace-pre-wrap break-words">{c.text}</p>
            </div>
          </div>
        ))}
      </div>

      {canPost && (
        <div className={`flex items-center gap-2 flex-shrink-0 ${fill ? 'p-4 pt-0' : ''}`}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Add a comment…"
            className="flex-1 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal bg-surface"
          />
          <button onClick={submit} className="text-slate-light hover:text-signal flex-shrink-0">
            <Send className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  )
}
