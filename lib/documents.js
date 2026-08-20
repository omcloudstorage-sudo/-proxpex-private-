function genId() {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function newDocument() {
  return { id: genId(), label: '', url: '', type: 'other' }
}
