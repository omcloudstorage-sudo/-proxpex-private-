import { NextResponse } from 'next/server'
import { requireProjectAccess } from '@/lib/requireAdmin'
import { signedDocumentUrl } from '@/lib/cloudinary'

// The client never sees a Cloudinary URL, signed or otherwise — it POSTs
// here with a Firebase ID token, we verify project access, mint a 60s
// signed URL server-side, fetch the bytes ourselves, and stream them back
// with Content-Disposition: inline (never `attachment`) so the browser
// renders the PDF instead of offering to save it. This is a real,
// meaningful barrier (no direct Cloudinary access, no downloadable link in
// the DOM, nothing to copy/share that keeps working), not a hard guarantee
// — a determined user can still save/print through the browser's own PDF
// viewer, or screenshot the page. See DocumentsPanel for how this is
// consumed (fetched as a blob, never a plain <a href>).
export async function POST(req) {
  try {
    const { projectId, publicId, filename } = await req.json()
    if (!projectId || !publicId) {
      return NextResponse.json({ error: 'Missing projectId or publicId.' }, { status: 400 })
    }

    await requireProjectAccess(req, projectId)

    const signedUrl = signedDocumentUrl(publicId)
    const upstream = await fetch(signedUrl)
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to load document.' }, { status: 502 })
    }
    const bytes = await upstream.arrayBuffer()

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${(filename || 'document.pdf').replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    const message = err?.message || 'Failed to load document.'
    return NextResponse.json({ error: message }, { status: err.status || 400 })
  }
}
