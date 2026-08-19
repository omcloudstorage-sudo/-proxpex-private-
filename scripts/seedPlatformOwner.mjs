// One-time seed for the single platform_owner account. Not reachable through
// any signup flow on purpose — this is the only way that role gets created.
//
// Usage:
//   node --env-file=.env.local scripts/seedPlatformOwner.mjs

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const PLATFORM_OWNER_EMAIL = 'omcloudstorage@gmail.com'

const CTRL_C = ''
const CTRL_D = ''
const BACKSPACE = ''

const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n')
if (!process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !privateKey) {
  console.error('Missing FIREBASE_ADMIN_* env vars. Run with: node --env-file=.env.local scripts/seedPlatformOwner.mjs')
  process.exit(1)
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
})
const auth = getAuth()
const db = getFirestore()

function promptHidden(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin
    process.stdout.write(query)
    stdin.resume()
    stdin.setRawMode(true)
    stdin.setEncoding('utf8')

    let value = ''
    const onData = (char) => {
      char = char.toString('utf8')

      if (char === '\n' || char === '\r' || char === CTRL_D) {
        stdin.setRawMode(false)
        stdin.pause()
        stdin.removeListener('data', onData)
        process.stdout.write('\n')
        resolve(value)
        return
      }

      if (char === CTRL_C) {
        process.stdout.write('\n')
        process.exit(1)
      }

      if (char === BACKSPACE || char === '\b') {
        value = value.slice(0, -1)
        return
      }

      value += char
    }
    stdin.on('data', onData)
  })
}

async function promptPassword() {
  while (true) {
    const password = await promptHidden('Set a password for the platform owner account: ')
    if (password.length < 6) {
      console.log('Password must be at least 6 characters.\n')
      continue
    }
    const confirm = await promptHidden('Confirm password: ')
    if (password !== confirm) {
      console.log("Passwords didn't match — try again.\n")
      continue
    }
    return password
  }
}

async function main() {
  console.log(`Seeding platform_owner account for ${PLATFORM_OWNER_EMAIL}\n`)

  const existingDocsSnap = await db.collection('users').where('role', '==', 'platform_owner').get()
  if (!existingDocsSnap.empty) {
    const existing = existingDocsSnap.docs[0]
    console.log(`A platform_owner account already exists (uid ${existing.id}, ${existing.data().email}). Nothing to do.`)
    process.exit(0)
  }

  let authUser = null
  try {
    authUser = await auth.getUserByEmail(PLATFORM_OWNER_EMAIL)
    console.log(`Found an existing Auth account for ${PLATFORM_OWNER_EMAIL} (uid ${authUser.uid}) — will attach the platform_owner role to it.`)
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err
  }

  if (!authUser) {
    const password = await promptPassword()
    authUser = await auth.createUser({ email: PLATFORM_OWNER_EMAIL, password })
    console.log(`\nCreated Auth account (uid ${authUser.uid}).`)
  }

  await db.collection('users').doc(authUser.uid).set({
    role: 'platform_owner',
    name: 'Platform Owner',
    email: PLATFORM_OWNER_EMAIL,
    createdAt: new Date().toISOString(),
  })

  console.log(`\nDone. ${PLATFORM_OWNER_EMAIL} will land on /owner after signing in through the normal login form.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message || err)
  process.exit(1)
})
