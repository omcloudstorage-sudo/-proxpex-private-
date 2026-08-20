'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import EntryModal from '@/components/EntryModal'

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

export default function AuditLogPanel({ entries }) {
  const [openEntry, setOpenEntry] = useState(null)

  return (
    <div className="bg-surface/90 backdrop-blur border border-line rounded-card shadow-card overflow-hidden">
      <div className="bg-paper/50 border-b border-line px-6 py-6">
        <div className="flex items-center gap-2">
          <History className="w-[18px] h-[18px] text-ink" strokeWidth={1.75} />
          <span className="text-xl font-display font-semibold text-ink uppercase tracking-wide">Audit log</span>
        </div>
        <p className="text-sm text-slate mt-1 pl-[26px]">A permanent, append-only history of everything that happened on this project.</p>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {(!entries || entries.length === 0) && (
          <p className="text-sm text-slate-light italic px-6 py-6">No activity yet.</p>
        )}
        {entries?.map((entry) => (
          <div
            key={entry.id}
            onClick={() => setOpenEntry(entry)}
            className="flex items-start gap-4 px-4 py-4 border-t border-line first:border-t-0 cursor-pointer hover:bg-paper/60 transition-colors"
          >
            <div className={`w-8 h-8 rounded-full border-2 border-white shadow-card flex items-center justify-center text-sm flex-shrink-0 ${toneFor(entry.actorName)}`}>
              {initials(entry.actorName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold text-ink leading-snug break-words line-clamp-2">{entry.description}</p>
                <span className="text-xs text-slate-light flex-shrink-0">{formatTimestamp(entry.createdAt)}</span>
              </div>
              <p className="text-sm text-slate mt-0.5">
                {entry.actorName || 'Unknown'}
                {entry.actorRole && <span> · {formatRole(entry.actorRole)}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      <EntryModal
        open={!!openEntry}
        onClose={() => setOpenEntry(null)}
        title={openEntry?.actorName || 'Unknown'}
        meta={openEntry && (
          <>
            {openEntry.actorRole && <span>{formatRole(openEntry.actorRole)}</span>}
            <span>{formatTimestamp(openEntry.createdAt)}</span>
          </>
        )}
      >
        {openEntry?.description}
      </EntryModal>
    </div>
  )
}

function formatRole(role) {
  return { admin: 'Admin', pm: 'Project Manager', client: 'Client', team_member: 'Team Member' }[role] || role
}

function formatTimestamp(ts) {
  if (!ts) return 'just now'
  const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
