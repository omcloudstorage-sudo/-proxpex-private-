import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { normalizeStage } from '@/lib/stages'

export function newTeamUpdate(author) {
  return {
    authorId: author?.uid || null,
    authorName: author?.name || 'Unknown',
    text: '',
    meetingLink: '',
    createdAt: new Date().toISOString(),
  }
}

// One-time backfill: Team Updates used to live embedded per-stage
// (stage.updates[], or the older stage.momEntries[]/stage.momNotes shapes —
// see normalizeStage). Now it's a single project-wide feed
// (projects/{id}/teamUpdates). Each migrated entry keeps stageId/stageName
// so it's still traceable to the stage it came from, even though the feed
// itself is no longer stage-scoped. Guarded by an emptiness check so it
// only ever runs once per project, the same way lib/usePriorityLibrary.js
// seeds defaults. firestore.rules requires authorId == the writer's own
// uid on create, so legacy entries with no authorId (pre-dating that
// field) are attributed to whoever runs the migration — authorName still
// shows the true original poster for display.
export async function migrateStageUpdatesToProjectFeed(projectId, stages, migratingUser) {
  const colRef = collection(db, 'projects', projectId, 'teamUpdates')
  const existing = await getDocs(colRef)
  if (!existing.empty) return

  const entries = []
  for (const stage of stages) {
    const normalized = normalizeStage(stage)
    for (const u of normalized.updates) {
      entries.push({
        authorId: u.authorId || migratingUser.uid,
        authorName: u.authorName || 'Prior update',
        text: u.text || '',
        meetingLink: u.meetingLink || '',
        createdAt: u.createdAt || new Date(0).toISOString(),
        stageId: stage.id,
        stageName: stage.name,
      })
    }
  }
  if (entries.length === 0) return

  for (const entry of entries) {
    await addDoc(colRef, entry)
  }
}
