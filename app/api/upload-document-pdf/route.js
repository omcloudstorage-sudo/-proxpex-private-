import { NextResponse } from 'next/server'
import { requireProjectManager } from '@/lib/requireAdmin'
import { uploadDocumentPdf, deleteDocumentPdf } from '@/lib/cloudinary'

// Deliberately smaller than the 10MB invoice limit (see upload-invoice-pdf)
// — these are meant for quick reference PDFs viewed inline, not large scans.
const MAX_BYTES = 2 * 1024 * 1024

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
      return NextResponse.json({ error: 'File is too large — 2MB max.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadDocumentPdf(buffer, {
      folder: `documents/${project.companyId}`,
      filename: file.name,
    })

    if (previousPublicId) {
      deleteDocumentPdf(previousPublicId).catch(() => {})
    }

    // No `url` in the response, unlike upload-invoice-pdf — the asset is
    // `type: authenticated`, so there's no public delivery URL to hand
    // back. The client stores only publicId/filename/size; viewing goes
    // through view-document-pdf, which signs a fresh URL server-side.
    return NextResponse.json({
      publicId: result.public_id,
      filename: file.name,
      size: file.size,
    })
  } catch (err) {
    const message = err?.message || 'Failed to upload file.'
    return NextResponse.json({ error: message }, { status: err.status || 400 })
  }
}
