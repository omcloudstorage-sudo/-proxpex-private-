'use client'

import { useState } from 'react'
import { Receipt, Plus, Pencil, Trash2, Check, X, Upload, FileText } from 'lucide-react'
import { newInvoice, formatCurrency, isOverdue, INVOICE_STATUS } from '@/lib/invoices'
import { AUDIT_ACTIONS } from '@/lib/auditLog'
import { callAdminApi, callAdminApiForm } from '@/lib/adminApi'

export default function InvoicesPanel({ invoices, canManage, onChange, logAction, stageName, projectId }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [uploadingId, setUploadingId] = useState(null)

  const list = invoices || []
  const billed = list.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
  const paid = list.filter((inv) => inv.status === INVOICE_STATUS.PAID).reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)

  function startAdd() {
    setDraft(newInvoice())
    setAdding(true)
    setEditingId(null)
  }
  function startEdit(invoice) {
    setDraft({ ...invoice })
    setEditingId(invoice.id)
    setAdding(false)
  }
  function cancelDraft() {
    setDraft(null)
    setAdding(false)
    setEditingId(null)
  }
  function saveDraft() {
    if (!draft.label.trim() || !draft.amount) return cancelDraft()
    if (adding) {
      onChange([...list, draft])
      logAction?.(AUDIT_ACTIONS.INVOICE_ADDED, `Added invoice "${draft.label}" (${formatCurrency(draft.amount)}) on "${stageName}"`)
    } else {
      onChange(list.map((inv) => (inv.id === draft.id ? draft : inv)))
      logAction?.(AUDIT_ACTIONS.INVOICE_UPDATED, `Updated invoice "${draft.label}" on "${stageName}"`)
    }
    cancelDraft()
  }
  function toggleStatus(invoice) {
    const nextStatus = invoice.status === INVOICE_STATUS.PAID ? INVOICE_STATUS.UNPAID : INVOICE_STATUS.PAID
    onChange(list.map((inv) => (inv.id === invoice.id ? { ...inv, status: nextStatus } : inv)))
    logAction?.(AUDIT_ACTIONS.INVOICE_UPDATED, `Marked invoice "${invoice.label}" as ${nextStatus} on "${stageName}"`)
  }
  function removeInvoice(invoice) {
    onChange(list.filter((inv) => inv.id !== invoice.id))
    logAction?.(AUDIT_ACTIONS.INVOICE_REMOVED, `Removed invoice "${invoice.label}" from "${stageName}"`)
    if (invoice.attachmentPublicId) {
      callAdminApi('/api/delete-invoice-pdf', { projectId, publicId: invoice.attachmentPublicId }).catch(() => {})
    }
  }

  async function uploadAttachment(invoice, file) {
    if (!file) return
    setUploadingId(invoice.id)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      if (invoice.attachmentPublicId) formData.append('previousPublicId', invoice.attachmentPublicId)

      const data = await callAdminApiForm('/api/upload-invoice-pdf', formData)
      const updated = { ...invoice, attachmentUrl: data.url, attachmentPublicId: data.publicId, attachmentFilename: data.filename }
      onChange(list.map((inv) => (inv.id === invoice.id ? updated : inv)))
      logAction?.(
        AUDIT_ACTIONS.INVOICE_ATTACHMENT_UPLOADED,
        `${invoice.attachmentUrl ? 'Replaced' : 'Uploaded'} PDF for invoice "${invoice.label}" on "${stageName}"`
      )
    } catch (err) {
      alert(err.message || 'Failed to upload PDF.')
    } finally {
      setUploadingId(null)
    }
  }

  function removeAttachment(invoice) {
    const publicId = invoice.attachmentPublicId
    const updated = { ...invoice, attachmentUrl: null, attachmentPublicId: null, attachmentFilename: null }
    onChange(list.map((inv) => (inv.id === invoice.id ? updated : inv)))
    logAction?.(AUDIT_ACTIONS.INVOICE_ATTACHMENT_REMOVED, `Removed PDF from invoice "${invoice.label}" on "${stageName}"`)
    if (publicId) {
      callAdminApi('/api/delete-invoice-pdf', { projectId, publicId }).catch(() => {})
    }
  }

  return (
    <div className="card-hover bg-surface/90 backdrop-blur border border-line rounded-card shadow-card p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Receipt className="w-[18px] h-[18px] text-ink" strokeWidth={1.75} />
          <span className="font-display text-xl font-semibold text-ink uppercase tracking-wide">Invoices</span>
        </div>
        {canManage && !adding && (
          <button onClick={startAdd} className="text-ink hover:text-signal flex items-center gap-1 text-sm font-semibold flex-shrink-0">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add
          </button>
        )}
      </div>
      <p className="text-sm text-slate mb-4">
        Billing for this stage.
        {list.length > 0 && (
          <span className="text-slate-light"> {formatCurrency(paid)} paid of {formatCurrency(billed)} billed.</span>
        )}
      </p>

      {adding && <div className="mb-2.5"><InvoiceForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} /></div>}

      {list.length === 0 && !adding && (
        <p className="text-sm text-slate-light italic">
          No invoices yet{canManage ? ' — add one to start tracking billing for this stage.' : '.'}
        </p>
      )}

      {list.length > 0 && (
        <div className="space-y-2">
          {list.map((invoice) =>
            editingId === invoice.id ? (
              <InvoiceForm key={invoice.id} draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelDraft} />
            ) : (
              <div
                key={invoice.id}
                className="flex items-center justify-between gap-3 bg-paper border border-line rounded-lg px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-ink truncate">{invoice.label}</div>
                  {invoice.dueDate && <div className="text-xs text-slate-light mt-0.5">Due {invoice.dueDate}</div>}
                  <InvoiceAttachment
                    invoice={invoice}
                    canManage={canManage}
                    uploading={uploadingId === invoice.id}
                    onSelectFile={(file) => uploadAttachment(invoice, file)}
                    onRemove={() => removeAttachment(invoice)}
                  />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-mono text-ink">{formatCurrency(invoice.amount)}</span>
                  <InvoiceStatusBadge invoice={invoice} onClick={canManage ? () => toggleStatus(invoice) : undefined} />
                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => startEdit(invoice)} className="text-slate-light hover:text-ink"><Pencil className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                      <button onClick={() => removeInvoice(invoice)} className="text-slate-light hover:text-coral"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function InvoiceAttachment({ invoice, canManage, uploading, onSelectFile, onRemove }) {
  const inputId = `invoice-pdf-${invoice.id}`

  if (!canManage) {
    if (!invoice.attachmentUrl) return null
    return (
      <a
        href={invoice.attachmentUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 text-signal hover:underline text-xs mt-1 min-w-0"
      >
        <FileText className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
        <span className="truncate">{invoice.attachmentFilename || 'View PDF'}</span>
      </a>
    )
  }

  return (
    <div className="flex items-center gap-2.5 mt-1 text-xs min-w-0">
      {invoice.attachmentUrl && (
        <a
          href={invoice.attachmentUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-signal hover:underline min-w-0"
        >
          <FileText className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
          <span className="truncate">{invoice.attachmentFilename || 'View PDF'}</span>
        </a>
      )}
      <label
        htmlFor={inputId}
        className={`flex items-center gap-1 flex-shrink-0 ${uploading ? 'text-slate-light' : 'text-slate-light hover:text-signal cursor-pointer'}`}
      >
        <Upload className="w-3 h-3" strokeWidth={2} />
        {uploading ? 'Uploading…' : invoice.attachmentUrl ? 'Replace' : 'Upload PDF'}
      </label>
      <input
        id={inputId}
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          onSelectFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {invoice.attachmentUrl && (
        <button onClick={onRemove} title="Remove PDF" className="text-slate-light hover:text-coral flex-shrink-0">
          <X className="w-3 h-3" strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

function InvoiceStatusBadge({ invoice, onClick }) {
  const overdue = isOverdue(invoice)
  const paid = invoice.status === INVOICE_STATUS.PAID
  const cls = paid
    ? 'bg-progress/10 text-progress border-progress/20'
    : overdue
      ? 'bg-coral-light text-coral border-coral/20'
      : 'bg-amber-light text-amber border-amber/20'
  const label = paid ? 'Paid' : overdue ? 'Overdue' : 'Unpaid'

  if (!onClick) {
    return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>
  }
  return (
    <button onClick={onClick} title="Toggle paid status" className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${cls} hover:opacity-80 transition-opacity`}>
      {label}
    </button>
  )
}

function InvoiceForm({ draft, setDraft, onSave, onCancel }) {
  return (
    <div className="border border-signal/40 rounded-lg px-3 py-2.5 bg-signal-light/30 space-y-2">
      <input
        autoFocus
        placeholder="Invoice label (e.g. Milestone 2 deposit)"
        value={draft.label}
        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        className="w-full border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      />
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount"
          value={draft.amount}
          onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
          className="w-32 border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
        />
        <input
          type="date"
          value={draft.dueDate || ''}
          onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
          className="flex-1 border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-signal bg-surface"
        />
        <select
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          className="border border-line rounded-lg px-2 py-1.5 text-sm outline-none focus:border-signal bg-surface"
        >
          <option value={INVOICE_STATUS.UNPAID}>Unpaid</option>
          <option value={INVOICE_STATUS.PAID}>Paid</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={onSave} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
      </div>
    </div>
  )
}
