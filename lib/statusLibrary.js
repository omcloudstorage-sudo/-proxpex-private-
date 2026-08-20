// Stage status is stored on each stage as a string ID that refers to an
// entry in the company's status library (companies/{companyId}/statusLibrary).
// The three IDs below are reserved: every company is seeded with them so
// stages created before this feature existed (raw 'pending'/'in_progress'/
// 'done' strings) keep resolving correctly with no data migration.
export const STATUS_KINDS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
}

export const STATUS_KIND_OPTIONS = [
  { value: STATUS_KINDS.PENDING, label: 'Pending' },
  { value: STATUS_KINDS.IN_PROGRESS, label: 'In progress' },
  { value: STATUS_KINDS.DONE, label: 'Done' },
]

export const MAX_ACTIVE_STATUSES = 6

// Cap for a single project's usable status set (company library selections
// plus any on-the-spot statuses a PM/Admin adds directly on the project
// screen — see project.customStatuses). Independent from
// MAX_ACTIVE_STATUSES, which caps the shared company library in Settings.
export const MAX_PROJECT_STATUSES = 8

export const DEFAULT_STATUSES = [
  { id: 'pending', name: 'Pending', color: '#64748b', kind: STATUS_KINDS.PENDING, active: true },
  { id: 'in_progress', name: 'In Progress', color: '#2563eb', kind: STATUS_KINDS.IN_PROGRESS, active: true },
  { id: 'done', name: 'Done', color: '#16a34a', kind: STATUS_KINDS.DONE, active: true },
]

function genId() {
  return `status_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function newStatus() {
  return { id: genId(), name: '', color: '#2563eb', kind: STATUS_KINDS.PENDING, active: false }
}

// Defensive lookup: if the library hasn't been seeded yet, or a stage
// references a status ID that no longer exists, fall back to treating a
// legacy ID as its own kind, and anything else as 'pending'.
export function resolveStatusKind(statusId, library) {
  const entry = (library || []).find((s) => s.id === statusId)
  if (entry) return entry.kind
  if (statusId === STATUS_KINDS.PENDING || statusId === STATUS_KINDS.IN_PROGRESS || statusId === STATUS_KINDS.DONE) {
    return statusId
  }
  return STATUS_KINDS.PENDING
}

export function getStatusDisplay(statusId, library) {
  const entry = (library || []).find((s) => s.id === statusId)
  if (entry) return entry
  const fallback = DEFAULT_STATUSES.find((s) => s.id === statusId)
  return fallback || { id: statusId, name: statusId || 'Unknown', color: '#64748b', kind: STATUS_KINDS.PENDING, active: true }
}

export function activeStatuses(library) {
  return (library || []).filter((s) => s.active)
}
