'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, Check, X, FileText, Upload, Eye, Loader2 } from 'lucide-react'
import { LINK_TYPE_OPTIONS, guessLinkType } from '@/lib/linkTypes'
import { newDocument, newUploadDocument, isUploadDocument } from '@/lib/documents'
import { AUDIT_ACTIONS } from '@/lib/auditLog'
import { callAdminApi, callAdminApiForm, callAdminApiBlob } from '@/lib/adminApi'
import LinkTypeIcon from '@/components/LinkTypeIcon'

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

export default function DocumentsPanel({ documents, editable, onChange, logAction, projectId }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null)
  const fileInputRef = useRef(null)

  function startAdd() {
    setDraft(newDocument())
    setAdding(true)
    setEditingId(null)
  }
  function startEdit(docItem) {
    setDraft({ ...docItem })
    setEditingId(docItem.id)
    setAdding(false)
  }
  function cancelDraft() {
    setDraft(null)
    setAdding(false)
    setEditingId(null)
  }
  function saveDraft() {
    if (!draft.url.trim()) return cancelDraft()
    const finalDraft = { ...draft, label: draft.label.trim() || draft.url.trim() }
    if (adding) {
      onChange([...(documents || []), finalDraft])
      logAction?.(AUDIT_ACTIONS.DOC_ADDED, `Added document "${finalDraft.label}"`)
    } else {
      onChange((documents || []).map((d) => (d.id === finalDraft.id ? finalDraft : d)))
      logAction?.(AUDIT_ACTIONS.DOC_EDITED, `Edited document "${finalDraft.label}"`)
    }
    cancelDraft()
  }
  function removeDocument(docItem) {
    onChange((documents || []).filter((d) => d.id !== docItem.id))
    if (isUploadDocument(docItem)) {
      logAction?.(AUDIT_ACTIONS.DOC_UPLOAD_REMOVED, `Removed uploaded document "${docItem.label}"`)
      if (docItem.publicId) {
        callAdminApi('/api/delete-document-pdf', { projectId, publicId: docItem.publicId }).catch(() => {})
      }
    } else {
      logAction?.(AUDIT_ACTIONS.DOC_REMOVED, `Removed document "${docItem.label}"`)
    }
  }

  async function handleFileSelect(file) {
    if (!file) return
    setUploadError('')
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('File is too large — 2MB max.')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      const data = await callAdminApiForm('/api/upload-document-pdf', formData)
      const doc = newUploadDocument(data)
      onChange([...(documents || []), doc])
      logAction?.(AUDIT_ACTIONS.DOC_UPLOADED, `Uploaded document "${doc.label}"`)
    } catch (err) {
      setUploadError(err.message || 'Failed to upload file.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-ink" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate">Documents</span>
        </div>
        {editable && !adding && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" strokeWidth={2} />}
              {uploading ? 'Uploading…' : 'Upload PDF'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                handleFileSelect(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <button onClick={startAdd} className="text-signal hover:text-signal-dark flex items-center gap-1 text-xs font-medium">
              <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Add link
            </button>
          </div>
        )}
      </div>

      {uploadError && <p className="text-xs text-coral mb-2">{uploadError}</p>}

      <ul className="space-y-1.5">
        {(documents || []).length === 0 && !adding && (
          <li className="text-sm text-slate-light italic">
            No documents yet{editable ? ' — add a link or upload a PDF to keep resources in one place.' : '.'}
          </li>
        )}

        {(documents || []).map((docItem) =>
          editingId === docItem.id ? (
            <li key={docItem.id}><DocumentForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></li>
          ) : (
            <li key={docItem.id} className="flex items-center justify-between gap-2 text-sm border border-transparent hover:border-line rounded-lg px-1.5 py-1 -mx-1.5">
              {isUploadDocument(docItem) ? (
                <button
                  onClick={() => setPreviewDoc(docItem)}
                  className="flex items-center gap-2 text-signal hover:underline truncate min-w-0 text-left"
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{docItem.label}</span>
                  <Eye className="w-3 h-3 flex-shrink-0 opacity-50" strokeWidth={2} />
                </button>
              ) : (
                <a href={docItem.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-signal hover:underline truncate min-w-0">
                  <LinkTypeIcon type={docItem.type} className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{docItem.label}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" strokeWidth={2} />
                </a>
              )}
              {editable && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isUploadDocument(docItem) && (
                    <button onClick={() => startEdit(docItem)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                  )}
                  <button onClick={() => removeDocument(docItem)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                </div>
              )}
            </li>
          )
        )}

        {adding && <li><DocumentForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></li>}
      </ul>

      {previewDoc && (
        <DocumentPreview projectId={projectId} docItem={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  )
}

// Fetches the PDF as an authenticated blob (never a plain navigable URL —
// see app/api/view-document-pdf/route.js for why) and renders it in the
// browser's native PDF viewer via an object URL. That native viewer
// typically carries its own save/print icons we cannot remove — see the
// caveat called out where this is wired up on the project page.
function DocumentPreview({ projectId, docItem, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let revoke = null
    let cancelled = false
    callAdminApiBlob('/api/view-document-pdf', { projectId, publicId: docItem.publicId, filename: docItem.filename })
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        revoke = url
        setBlobUrl(url)
      })
      .catch((err) => !cancelled && setError(err.message || 'Failed to load document.'))
    return () => {
      cancelled = true
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [projectId, docItem.publicId, docItem.filename])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-card shadow-card border border-line w-[95vw] max-w-4xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-line flex-shrink-0">
          <span className="font-display text-sm font-semibold text-ink truncate">{docItem.label}</span>
          <button onClick={onClose} className="text-slate-light hover:text-ink flex-shrink-0"><X className="w-4 h-4" strokeWidth={1.75} /></button>
        </div>
        <div className="flex-1 min-h-0">
          {error && <p className="text-sm text-coral p-5">{error}</p>}
          {!error && !blobUrl && <p className="text-sm text-slate-light p-5">Loading…</p>}
          {blobUrl && <iframe src={blobUrl} title={docItem.label} className="w-full h-full border-0" />}
        </div>
      </div>
    </div>
  )
}

function DocumentForm({ draft, setDraft, onSave, onCancel }) {
  function handleUrlChange(url) {
    const guessedType = draft.url ? draft.type : guessLinkType(url)
    setDraft({ ...draft, url, type: guessedType })
  }

  return (
    <div className="border border-signal/40 rounded-lg px-3 py-2.5 bg-signal-light/30 space-y-2 mt-1">
      <input
        placeholder="https://…"
        value={draft.url}
        onChange={(e) => handleUrlChange(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      />
      <input
        placeholder="Label (e.g. Project proposal)"
        value={draft.label}
        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      />
      <select
        value={draft.type}
        onChange={(e) => setDraft({ ...draft, type: e.target.value })}
        className="w-full border border-line rounded-lg px-2 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      >
        {LINK_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
      </div>
    </div>
  )
}
