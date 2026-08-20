// Priority is a company-wide configurable list (same pattern as the status
// library), independent of it — no "kind" concept, just display order,
// name, and color. The four IDs below are reserved: every company is
// seeded with them so rows created before this was configurable (raw
// 'critical'/'high'/'medium'/'low' strings) keep resolving with no
// migration.
export const DEFAULT_PRIORITIES = [
  { id: 'critical', name: 'Critical', color: '#dc2626', order: 0 },
  { id: 'high', name: 'High', color: '#ea580c', order: 1 },
  { id: 'medium', name: 'Medium', color: '#ca8a04', order: 2 },
  { id: 'low', name: 'Low', color: '#16a34a', order: 3 },
]

export const DEFAULT_PRIORITY_ID = 'medium'

function genId() {
  return `pri_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function newPriority(order) {
  return { id: genId(), name: '', color: '#2563eb', order }
}

// Defensive lookup, mirrors resolveStatusKind/getStatusDisplay in
// lib/statusLibrary.js: falls back to the reserved default IDs, then to a
// generic gray badge for anything else.
export function resolvePriority(priorityId, library) {
  const entry = (library || []).find((p) => p.id === priorityId)
  if (entry) return entry
  const fallback = DEFAULT_PRIORITIES.find((p) => p.id === priorityId)
  return fallback || { id: priorityId, name: priorityId || 'Unknown', color: '#64748b', order: 99 }
}

export function sortedPriorities(library) {
  return [...(library || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
