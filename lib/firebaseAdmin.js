import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length) return getApps()[0]

  const projectId = (process.env.FIREBASE_ADMIN_PROJECT_ID || '').trim()
  const clientEmail = (process.env.FIREBASE_ADMIN_CLIENT_EMAIL || '').trim()
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim()

  // Validate before calling initializeApp(): on a cold start, env vars can
  // momentarily be unavailable. If we let a broken cert() call through,
  // firebase-admin still registers the app, and getApps().length above
  // then keeps returning that permanently-broken app for the rest of this
  // container's lifetime — every later request fails the same way even
  // once the env is fine. Throwing here instead leaves getApps() empty so
  // the next request gets a clean retry.
  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      !projectId && 'FIREBASE_ADMIN_PROJECT_ID',
      !clientEmail && 'FIREBASE_ADMIN_CLIENT_EMAIL',
      !privateKey && 'FIREBASE_ADMIN_PRIVATE_KEY',
    ].filter(Boolean).join(', ')
    throw new Error(`Firebase Admin is not configured: missing ${missing}.`)
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

export function adminAuth() {
  return getAuth(getAdminApp())
}

export function adminDb() {
  return getFirestore(getAdminApp())
}
