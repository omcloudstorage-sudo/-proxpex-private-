import { NextResponse } from 'next/server'
import { requireProjectManager } from '@/lib/requireAdmin'
import { deleteInvoicePdf } from '@/lib/cloudinary'

export async function POST(req) {
  try {
    const { projectId, publicId } = await req.json()
    if (!projectId || !publicId) {
      return NextResponse.json({ error: 'Missing projectId or publicId.' }, { status: 400 })
    }

    await requireProjectManager(req, projectId)
    await deleteInvoicePdf(publicId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err?.message || 'Failed to delete file.'
    return NextResponse.json({ error: message }, { status: err.status || 400 })
  }
}
