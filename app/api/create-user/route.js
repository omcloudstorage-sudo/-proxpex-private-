import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebaseAdmin'
import { requireManager } from '@/lib/requireAdmin'

export async function POST(req) {
  try {
    const { uid, caller } = await requireManager(req)
    const { name, email, password, role, pmId } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing or invalid fields.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    let finalPmId = null

    if (caller.role === 'admin') {
      if (!['pm', 'client', 'team_member'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
      }
      if (role === 'team_member') {
        if (!pmId) return NextResponse.json({ error: 'Choose which PM this team member reports to.' }, { status: 400 })
        const pmSnap = await adminDb().collection('users').doc(pmId).get()
        const pm = pmSnap.data()
        if (!pm || pm.role !== 'pm' || pm.companyId !== caller.companyId) {
          return NextResponse.json({ error: 'Invalid project manager selected.' }, { status: 400 })
        }
        finalPmId = pmId
      }
    } else {
      // caller.role === 'pm'
      if (role !== 'team_member') {
        return NextResponse.json({ error: 'Project managers can only add team members.' }, { status: 403 })
      }
      finalPmId = uid
    }

    const newUser = await adminAuth().createUser({ email, password, displayName: name })

    await adminDb().collection('users').doc(newUser.uid).set({
      role,
      companyId: caller.companyId,
      name,
      email,
      createdAt: new Date().toISOString(),
      ...(role === 'team_member' ? { pmId: finalPmId } : {}),
    })

    return NextResponse.json({ uid: newUser.uid })
  } catch (err) {
    const message = err?.errorInfo?.message || err?.message || 'Failed to create user.'
    return NextResponse.json({ error: message }, { status: err.status || 400 })
  }
}
