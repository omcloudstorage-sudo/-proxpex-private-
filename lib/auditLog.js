import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const AUDIT_ACTIONS = {
  STAGE_STATUS_CHANGED: 'stage_status_changed',
  STAGE_DATE_CHANGED: 'stage_date_changed',
  DOC_ADDED: 'doc_added',
  DOC_EDITED: 'doc_edited',
  DOC_REMOVED: 'doc_removed',
  DOC_UPLOADED: 'doc_uploaded',
  DOC_UPLOAD_REMOVED: 'doc_upload_removed',
  TEAM_UPDATE_POSTED: 'team_update_posted',
  MOM_CREATED: 'mom_created',
  MOM_APPROVED: 'mom_approved',
  PROJECT_CREATED: 'project_created',
  RESOURCE_SECTION_ADDED: 'resource_section_added',
  RESOURCE_SECTION_RENAMED: 'resource_section_renamed',
  RESOURCE_SECTION_REMOVED: 'resource_section_removed',
  RESOURCE_ITEM_ADDED: 'resource_item_added',
  RESOURCE_ITEM_REMOVED: 'resource_item_removed',
  RESOURCE_VALUE_UPDATED: 'resource_value_updated',
  STATUS_ADDED: 'status_added',
  INVOICE_ADDED: 'invoice_added',
  INVOICE_UPDATED: 'invoice_updated',
  INVOICE_REMOVED: 'invoice_removed',
  INVOICE_ATTACHMENT_UPLOADED: 'invoice_attachment_uploaded',
  INVOICE_ATTACHMENT_REMOVED: 'invoice_attachment_removed',
  TASK_CREATED: 'task_created',
  SUBTASK_CREATED: 'subtask_created',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_ASSIGNED: 'task_assigned',
  TASK_DELETED: 'task_deleted',
  TASK_COMMENT_POSTED: 'task_comment_posted',
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
