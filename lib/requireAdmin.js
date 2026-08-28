import { adminAuth, adminDb } from '@/lib/firebaseAdmin'

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

async function requireCaller(req) {
  const authHeader = req.headers.get('authorization') || ''
  const idToken = authHeader.replace('Bearer ', '')
  if (!idToken) throw httpError(401, 'Missing auth token')

  const decoded = await adminAuth().verifyIdToken(idToken)
  const callerSnap = await adminDb().collection('users').doc(decoded.uid).get()
  const caller = callerSnap.data()
  if (!caller) throw httpError(403, 'Account not found.')

  return { uid: decoded.uid, caller }
}

// Admin-only actions (managing PMs/Clients/Team members, company-wide).
export async function requireAdmin(req) {
  const { uid, caller } = await requireCaller(req)
  if (caller.role !== 'admin') throw httpError(403, 'Only a company admin can do this.')
  return { uid, caller }
}

// Admin or PM actions (creating a team member).
export async function requireManager(req) {
  const { uid, caller } = await requireCaller(req)
  if (!['admin', 'pm'].includes(caller.role)) throw httpError(403, 'Only an admin or project manager can do this.')
  return { uid, caller }
}

// Admin (same company) or the PM assigned to this specific project — used
// for invoice PDF upload/delete, where "Admin or PM" isn't enough on its
// own (a PM on a different project shouldn't touch this one's invoices).
export async function requireProjectManager(req, projectId) {
  const { uid, caller } = await requireManager(req)
  const projectSnap = await adminDb().collection('projects').doc(projectId).get()
  const project = projectSnap.data()
  if (!project) throw httpError(404, 'Project not found.')

  const allowed =
    (caller.role === 'admin' && project.companyId === caller.companyId) ||
    (caller.role === 'pm' && project.pmId === uid)
  if (!allowed) throw httpError(403, 'Only an admin or this project\'s manager can do this.')

  return { uid, caller, project }
}

// Loads the target user and checks the caller is allowed to manage them:
// an Admin can manage any PM/Client/Team member in their company; a PM can
// manage the Team members they themselves added, plus any Client in the
// company (clients are a shared roster PMs assign to their own projects).
export async function requireManagedTarget(uid, caller, targetUid) {
  const targetSnap = await adminDb().collection('users').doc(targetUid).get()
  const target = targetSnap.data()
  if (!target || target.companyId !== caller.companyId) throw httpError(404, 'User not found in your company.')

  if (caller.role === 'admin' && ['pm', 'client', 'team_member'].includes(target.role)) return target
  if (caller.role === 'pm' && target.role === 'client') return target
  if (caller.role === 'pm' && target.role === 'team_member' && target.pmId === uid) return target

  throw httpError(403, "You don't have permission to manage this account.")
}
