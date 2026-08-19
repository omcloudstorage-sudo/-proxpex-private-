import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const AUDIT_ACTIONS = {
  STAGE_STATUS_CHANGED: 'stage_status_changed',
  STAGE_DATE_CHANGED: 'stage_date_changed',
  DOC_ADDED: 'doc_added',
  DOC_EDITED: 'doc_edited',
  DOC_REMOVED: 'doc_removed',
  TEAM_UPDATE_POSTED: 'team_update_posted',
  MOM_CREATED: 'mom_created',
  MOM_APPROVED: 'mom_approved',
  PROJECT_CREATED: 'project_created',
}

// Appends one append-only audit log entry for a project. Never call
// updateDoc/deleteDoc against this collection — firestore.rules enforces
// that create is the only allowed operation, for every role, including Admin.
export async function logAction(projectId, actor, action, description, extra = {}) {
  await addDoc(collection(db, 'projects', projectId, 'auditLog'), {
    actorId: actor?.uid || null,
    actorName: actor?.name || 'Unknown',
    actorRole: actor?.role || null,
    action,
    description,
    createdAt: serverTimestamp(),
    ...extra,
  })
}
