function genId() {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function newDocument() {
  return { id: genId(), label: '', url: '', type: 'other' }
}

// An uploaded PDF, as opposed to a pasted link — no `url` field at all
// (the Cloudinary asset is private; publicId is only ever used server-side
// by the view/thumbnail/delete routes to mint a fresh signed request).
export function newUploadDocument({ publicId, filename, size }) {
  return { id: genId(), kind: 'upload', label: filename, publicId, filename, size, uploadedAt: Date.now() }
}

export function isUploadDocument(docItem) {
  return docItem?.kind === 'upload'
}
