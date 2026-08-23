// Kanban board columns, company-wide and reusable across every project —
// same pattern as lib/priorityLibrary.js / lib/statusLibrary.js. "To Do" and
// "Done" are the required bookend columns (fixed: true) — never
// renamable/removable/reorderable in the UI. Everything between them is a
// custom column any Admin/PM can add, shared by every project's board.
export const DEFAULT_COLUMNS = [
  { id: 'todo', name: 'To Do', order: 0, fixed: true },
  { id: 'in_progress', name: 'In Progress', order: 1, fixed: false },
  { id: 'review', name: 'Review', order: 2, fixed: false },
  { id: 'done', name: 'Done', order: 99, fixed: true },
]

export const TODO_COLUMN_ID = 'todo'
export const DONE_COLUMN_ID = 'done'

function genId() {
  return `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function newColumn(order) {
  return { id: genId(), name: '', order, fixed: false }
}

// Fixed bookends first/last, everything else sorted by order in between —
// defensive even though DEFAULT_COLUMNS/new entries already sort this way.
export function sortedColumns(library) {
  const list = library || []
  const todo = list.find((c) => c.id === TODO_COLUMN_ID)
  const done = list.find((c) => c.id === DONE_COLUMN_ID)
  const middle = list.filter((c) => c.id !== TODO_COLUMN_ID && c.id !== DONE_COLUMN_ID).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return [todo, ...middle, done].filter(Boolean)
}
