export const DEFAULT_STAGE_NAMES = [
  'Kickoff',
  'Requirement Gathering',
  'UI/UX Design',
  'Development',
  'QA & Testing',
  'Launch',
]

export const STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// statusIds.first/rest are status-library IDs (defaults to the seeded
// 'in_progress'/'pending' library entries — see lib/statusLibrary.js).
export function makeStages(stageDefs, statusIds = {}) {
  const { first = STATUS.IN_PROGRESS, rest = STATUS.PENDING } = statusIds
  return stageDefs.map((s, i) => ({
    id: `stage_${i}_${Date.now()}`,
    name: s.name,
    order: i,
    status: i === 0 ? first : rest,
    updates: [],
    dueDate: null,
    completedAt: null,
    invoices: [],
  }))
}

export function makeDefaultStages(statusIds) {
  return makeStages(DEFAULT_STAGE_NAMES.map((name) => ({ name })), statusIds)
}

export function newStage(order, statusId = STATUS.PENDING) {
  return {
    id: `stage_${order}_${Date.now()}`,
    name: 'New Stage',
    order,
    status: statusId,
    updates: [],
    dueDate: null,
    completedAt: null,
    invoices: [],
  }
}

export function newUpdate(author) {
  return {
    id: genId('update'),
    authorId: author?.uid || null,
    authorName: author?.name || 'Unknown',
    text: '',
    meetingLink: '',
    createdAt: new Date().toISOString(),
  }
}

// Defensive read-time normalizer: brings older stage shapes (the single
// `momNotes` string, the dated `momEntries` list before updates carried an
// author) up to the current shape so nothing breaks on data that predates
// a schema change.
export function normalizeStage(stage) {
  let updates
  if (Array.isArray(stage.updates)) {
    updates = stage.updates
  } else if (Array.isArray(stage.momEntries)) {
    updates = stage.momEntries.map((e) => ({
      id: e.id || genId('update'),
      authorId: null,
      authorName: 'Prior update',
      text: e.notes || '',
      meetingLink: e.meetingLink || '',
      createdAt: e.date ? `${e.date}T00:00:00.000Z` : null,
    }))
  } else if (stage.momNotes) {
    updates = [{ id: genId('update'), authorId: null, authorName: 'Prior update', text: stage.momNotes, meetingLink: '', createdAt: null }]
  } else {
    updates = []
  }

  return {
    ...stage,
    updates,
    invoices: Array.isArray(stage.invoices) ? stage.invoices : [],
  }
}
