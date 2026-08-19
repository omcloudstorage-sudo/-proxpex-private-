import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebaseAdmin'
import { requireManager, requireManagedTarget } from '@/lib/requireAdmin'

export async function POST(req) {
  try {
    const { uid, caller } = await requireManager(req)
    const { uid: targetUid } = await req.json()

    if (!targetUid) {
      return NextResponse.json({ error: 'Missing user id.' }, { status: 400 })
    }
    await requireManagedTarget(uid, caller, targetUid)

    await adminAuth().deleteUser(targetUid)
    await adminDb().collection('users').doc(targetUid).delete()

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err?.errorInfo?.message || err?.message || 'Failed to remove user.'
    return NextResponse.json({ error: message }, { status: err.status || 400 })
  }
}
