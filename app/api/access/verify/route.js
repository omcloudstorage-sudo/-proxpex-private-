import { adminDb } from '@/lib/firebaseAdmin'

// Checks a visitor-entered code against platformConfig/access (Admin SDK,
// so the real code never has to be exposed via a public Firestore read
// rule — the client only ever learns valid/invalid, never the value).
export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!code) return Response.json({ valid: false })

  try {
    const snap = await adminDb().doc('platformConfig/access').get()
    const realCode = (snap.exists ? snap.data().code : '') || ''
    const valid = realCode.length > 0 && code.toLowerCase() === realCode.toLowerCase()
    return Response.json({ valid })
  } catch (err) {
    return Response.json({ error: err.message || 'Something went wrong.' }, { status: 500 })
  }
}
