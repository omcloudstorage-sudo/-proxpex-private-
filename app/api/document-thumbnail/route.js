import { NextResponse } from 'next/server'
import { requireProjectAccess } from '@/lib/requireAdmin'
import { signedDocumentThumbnailUrl } from '@/lib/cloudinary'

// Same proxy pattern as view-document-pdf, for the small first-page JPEG
// shown on the Documents sidebar icon.
export async function POST(req) {
  try {
    const { projectId, publicId } = await req.json()
    if (!projectId || !publicId) {
      return NextResponse.json({ error: 'Missing projectId or publicId.' }, { status: 400 })
    }

    await requireProjectAccess(req, projectId)

    const signedUrl = signedDocumentThumbnailUrl(publicId)
    const upstream = await fetch(signedUrl)
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to load thumbnail.' }, { status: 502 })
    }
    const bytes = await upstream.arrayBuffer()

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    const message = err?.message || 'Failed to load thumbnail.'
    return NextResponse.json({ error: message }, { status: err.status || 400 })
  }
}
