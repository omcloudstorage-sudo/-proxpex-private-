export const INVOICE_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
}

function genId() {
  return `invoice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function newInvoice() {
  return { id: genId(), label: '', amount: '', dueDate: '', status: INVOICE_STATUS.UNPAID }
}

export function formatCurrency(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

// Overdue is derived, not stored — an unpaid invoice past its due date reads
// as overdue without needing a background job to flip a stored status.
export function isOverdue(invoice) {
  if (!invoice || invoice.status !== INVOICE_STATUS.UNPAID || !invoice.dueDate) return false
  return invoice.dueDate < new Date().toISOString().slice(0, 10)
}
