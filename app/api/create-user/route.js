import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { sendPasswordResetEmail } from 'firebase/auth'
import { adminAuth, adminDb } from '@/lib/firebaseAdmin'
import { requireManager } from '@/lib/requireAdmin'
import { auth as clientAuth } from '@/lib/firebase'

export async function POST(req) {
  try {
    const { uid, caller } = await requireManager(req)
    const { name, email, role, pmId } = await req.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Missing or invalid fields.' }, { status: 400 })
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
      if (!['team_member', 'client'].includes(role)) {
        return NextResponse.json({ error: 'Project managers can only add team members or clients.' }, { status: 403 })
      }
      if (role === 'team_member') finalPmId = uid
    }

    const generatedPassword = crypto.randomBytes(32).toString('hex')
    const newUser = await adminAuth().createUser({ email, password: generatedPassword, displayName: name })

    await adminDb().collection('users').doc(newUser.uid).set({
      role,
      companyId: caller.companyId,
      name,
      email,
      createdAt: new Date().toISOString(),
      ...(role === 'team_member' ? { pmId: finalPmId } : {}),
    })

    try {
      await sendPasswordResetEmail(clientAuth, email)
    } catch (err) {
      // Account already exists at this point — surface a warning but don't fail the request.
      return NextResponse.json({ uid: newUser.uid, warning: 'Account created, but the password setup email could not be sent.' })
    }

    return NextResponse.json({ uid: newUser.uid })
  } catch (err) {
    const message = err?.errorInfo?.message || err?.message || 'Failed to create user.'
    return NextResponse.json({ error: message }, { status: err.status || 400 })
  }
}
