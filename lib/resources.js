function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const ITEM_TYPES = {
  RESOURCE: 'resource',
  KEY: 'key',
  CREDENTIAL: 'credential',
  LINK: 'link',
}

export const DEFAULT_SECTION_NAMES = ['Key Resources', 'Project Keys', 'Credentials', 'Project Links']

export function newSection(order, name = 'New section') {
  return { id: genId('sec'), name, order, items: [] }
}

// Seeds a fresh set of the 4 sections shown in the design, all empty —
// used when a project has no template (or the template has none saved).
export function defaultSections() {
  return DEFAULT_SECTION_NAMES.map((name, i) => newSection(i, name))
}

export function newItem(type, order) {
  const base = { id: genId('item'), type, order }
  switch (type) {
    case ITEM_TYPES.KEY:
      return { ...base, name: '', value: '' }
    case ITEM_TYPES.CREDENTIAL:
      return { ...base, label: '', username: '', password: '' }
    case ITEM_TYPES.LINK:
      return { ...base, name: '', url: '' }
    case ITEM_TYPES.RESOURCE:
    default:
      return { ...base, name: '', notes: '' }
  }
}

// Deep-copies a set of sections for a new project instance (fresh IDs so
// edits on one project's items never collide with the template's or another
// project's). Structural fields (names/labels/urls) carry over; secret
// fields (value/password) always start blank on the new project.
export function instantiateSections(sections) {
  return (sections || []).map((s, si) => ({
    id: genId('sec'),
    name: s.name,
    order: si,
    items: (s.items || []).map((it, ii) => {
      const copy = { id: genId('item'), type: it.type, order: ii }
      if (it.type === ITEM_TYPES.KEY) return { ...copy, name: it.name || '', value: '' }
      if (it.type === ITEM_TYPES.CREDENTIAL) return { ...copy, label: it.label || '', username: it.username || '', password: '' }
      if (it.type === ITEM_TYPES.LINK) return { ...copy, name: it.name || '', url: it.url || '' }
      return { ...copy, name: it.name || '', notes: it.notes || '' }
    }),
  }))
}

// Defensive: drop anything that isn't the sections/items shape so it never
// renders broken (e.g. leftover data from before this feature existed).
export function normalizeSections(sections) {
  if (!Array.isArray(sections)) return []
  return sections.filter((s) => s && Array.isArray(s.items))
}
