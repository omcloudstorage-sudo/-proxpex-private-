import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebaseAdmin'
import { requireManager, requireManagedTarget } from '@/lib/requireAdmin'

export async function POST(req) {
  try {
    const { uid, caller } = await requireManager(req)
    const { uid: targetUid, name, email } = await req.json()

    if (!targetUid || !name || !email) {
      return NextResponse.json({ error: 'Missing or invalid fields.' }, { status: 400 })
    }
    await requireManagedTarget(uid, caller, targetUid)

    await adminAuth().updateUser(targetUid, { email, displayName: name })
    await adminDb().collection('users').doc(targetUid).update({ name, email })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err?.errorInfo?.message || err?.message || 'Failed to update user.'
    return NextResponse.json({ error: message }, { status: err.status || 400 })
  }
}
