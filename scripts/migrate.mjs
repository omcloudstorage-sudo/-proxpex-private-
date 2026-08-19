// One-off migration for the Owner→Admin rename and the stage data model
// changes (typed links; momNotes string → momEntries → unified `updates`
// feed with an author). Safe to re-run — every step is a no-op on
// already-migrated data.
//
// Usage:
//   node --env-file=.env.local scripts/migrate.mjs           (dry run, prints what would change)
//   node --env-file=.env.local scripts/migrate.mjs --apply   (writes the changes)

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { guessLinkType } from '../lib/linkTypes.js'

const apply = process.argv.includes('--apply')

const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n')
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
})
const db = getFirestore()

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function migrateStage(stage) {
  let changed = false
  const next = { ...stage }

  if (!Array.isArray(next.updates)) {
    if (Array.isArray(next.momEntries)) {
      next.updates = next.momEntries.map((e) => ({
        id: e.id || genId('update'),
        authorId: null,
        authorName: 'Prior update',
        text: e.notes || '',
        meetingLink: e.meetingLink || '',
        createdAt: e.date ? `${e.date}T00:00:00.000Z` : null,
      }))
    } else if (next.momNotes) {
      next.updates = [{ id: genId('update'), authorId: null, authorName: 'Prior update', text: next.momNotes, meetingLink: '', createdAt: null }]
    } else {
      next.updates = []
    }
    changed = true
  }
  if ('momEntries' in next) {
    delete next.momEntries
    changed = true
  }
  if ('momNotes' in next) {
    delete next.momNotes
    changed = true
  }

  const links = (next.links || []).map((link) => {
    if (link.id && link.type) return link
    changed = true
    return { id: link.id || genId('link'), label: link.label, url: link.url, type: link.type || guessLinkType(link.url) }
  })
  next.links = links

  return { stage: next, changed }
}

async function migrateUsers() {
  const snap = await db.collection('users').where('role', '==', 'owner').get()
  console.log(`users: ${snap.size} with role 'owner' to migrate to 'admin'`)
  for (const docSnap of snap.docs) {
    console.log(`  - ${docSnap.id} (${docSnap.data().email})`)
    if (apply) await docSnap.ref.update({ role: 'admin' })
  }
}

async function migrateProjects() {
  const snap = await db.collection('projects').get()
  console.log(`projects: scanning ${snap.size} project(s)`)
  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const stages = data.stages || []
    let anyChanged = false
    const nextStages = stages.map((stage) => {
      const { stage: migrated, changed } = migrateStage(stage)
      if (changed) anyChanged = true
      return migrated
    })
    if (anyChanged) {
      console.log(`  - ${docSnap.id} (${data.name}) needs migration`)
      if (apply) await docSnap.ref.update({ stages: nextStages })
    }
  }
}

await migrateUsers()
await migrateProjects()

console.log(apply ? '\nDone — changes written.' : '\nDry run only — pass --apply to write these changes.')
process.exit(0)
