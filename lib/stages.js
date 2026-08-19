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

export function makeDefaultStages() {
  return DEFAULT_STAGE_NAMES.map((name, i) => ({
    id: `stage_${i}_${Date.now()}`,
    name,
    order: i,
    status: i === 0 ? STATUS.IN_PROGRESS : STATUS.PENDING,
    updates: [],
    links: [],
    dueDate: null,
  }))
}

export function newStage(order) {
  return {
    id: `stage_${order}_${Date.now()}`,
    name: 'New Stage',
    order,
    status: STATUS.PENDING,
    updates: [],
    links: [],
    dueDate: null,
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

export function newLink() {
  return { id: genId('link'), label: '', url: '', type: 'other' }
}

// Defensive read-time normalizer: brings older stage shapes (the single
// `momNotes` string, the dated `momEntries` list before updates carried an
// author, links without `type`/`id`) up to the current shape so nothing
// breaks on data that predates a schema change.
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

  const links = (stage.links || []).map((link) => ({
    id: link.id || genId('link'),
    label: link.label,
    url: link.url,
    type: link.type || 'other',
  }))

  return { ...stage, updates, links }
}
