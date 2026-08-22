import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'
import { requireManager, requireManagedTarget } from '@/lib/requireAdmin'

export async function POST(req) {
  // TEMP DIAGNOSTIC — remove after confirming env vars in CloudWatch.
  console.log('RESET-PASSWORD ROUTE HIT')
  console.log('RESET-PASSWORD ENV CHECK: FIREBASE_ADMIN_PROJECT_ID present =', !!process.env.FIREBASE_ADMIN_PROJECT_ID)
  console.log('RESET-PASSWORD ENV CHECK: FIREBASE_ADMIN_CLIENT_EMAIL present =', !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
  console.log('RESET-PASSWORD ENV CHECK: FIREBASE_ADMIN_PRIVATE_KEY present =', !!process.env.FIREBASE_ADMIN_PRIVATE_KEY)

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
