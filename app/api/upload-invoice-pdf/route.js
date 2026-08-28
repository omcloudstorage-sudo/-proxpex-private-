import { NextResponse } from 'next/server'
import { requireProjectManager } from '@/lib/requireAdmin'
import { uploadInvoicePdf, deleteInvoicePdf } from '@/lib/cloudinary'

const MAX_BYTES = 10 * 1024 * 1024

export async function POST(req) {
  try {
    const formData = await req.formData()
    const projectId = formData.get('projectId')
    const previousPublicId = formData.get('previousPublicId') || null
    const file = formData.get('file')

    if (!projectId) return NextResponse.json({ error: 'Missing projectId.' }, { status: 400 })
    const { project } = await requireProjectManager(req, projectId)

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File is too large — 10MB max.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadInvoicePdf(buffer, {
      folder: `invoices/${project.companyId}`,
      filename: file.name,
    })

    if (previousPublicId) {
      // Best-effort cleanup of the file this one replaces — don't fail the
      // upload (which already succeeded) just because the old one lingers.
      deleteInvoicePdf(previousPublicId).catch(() => {})
    }

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      filename: file.name,
    })
  } catch (err) {
    const message = err?.message || 'Failed to upload file.'
    return NextResponse.json({ error: message }, { status: err.status || 400 })
  }
}
