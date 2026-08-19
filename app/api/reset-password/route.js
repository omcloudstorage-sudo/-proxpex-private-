import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'
import { requireManager, requireManagedTarget } from '@/lib/requireAdmin'

export async function POST(req) {
  try {
    const { uid, caller } = await requireManager(req)
    const { uid: targetUid, password } = await req.json()

    if (!targetUid || !password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }
    await requireManagedTarget(uid, caller, targetUid)

    await adminAuth().updateUser(targetUid, { password })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err?.errorInfo?.message || err?.message || 'Failed to reset password.'
    return NextResponse.json({ error: message }, { status: err.status || 400 })
  }
}
