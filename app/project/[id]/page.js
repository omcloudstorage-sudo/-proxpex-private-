'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  doc, onSnapshot, updateDoc, collection, query, orderBy, limit,
  addDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import TopNav from '@/components/TopNav'
import RoadmapTimeline from '@/components/RoadmapTimeline'
import StagePanel from '@/components/StagePanel'
import AuditLogPanel from '@/components/AuditLogPanel'
import DocumentsPanel from '@/components/DocumentsPanel'
import ResourcesPanel from '@/components/ResourcesPanel'
import { newStage } from '@/lib/stages'
import { MOM_STATUS } from '@/lib/momEntries'
import { AUDIT_ACTIONS, logAction as writeAuditLog } from '@/lib/auditLog'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { activeStatuses, STATUS_KINDS, MAX_PROJECT_STATUSES } from '@/lib/statusLibrary'

const NO_ACCESS = { canView: false, canManage: false, canPostUpdate: false }

export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [project, setProject] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [activeStageId, setActiveStageId] = useState(null)
  const [momEntries, setMomEntries] = useState([])
  const [auditLog, setAuditLog] = useState([])

  useEffect(() => {
    if (!id) return
    const unsub = onSnapshot(
      doc(db, 'projects', id),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true)
          return
        }
        const data = { id: snap.id, ...snap.data() }
        setProject(data)
        setActiveStageId((current) => current || (data.stages?.[0]?.id ?? null))
      },
      () => setNotFound(true)
    )
    return unsub
  }, [id])

  useEffect(() => {
    if (!id) return
    const unsubMom = onSnapshot(collection(db, 'projects', id, 'momEntries'), (snap) => {
      setMomEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    const unsubLog = onSnapshot(
      query(collection(db, 'projects', id, 'auditLog'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => setAuditLog(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    return () => {
      unsubMom()
      unsubLog()
    }
  }, [id])

  // canManage: edit stage name/status/dates and Documents & Links, create MOM entries.
  // canPostUpdate: post a new entry to the stage Team Updates feed.
  // Anyone who can view can also see docs/updates/MOM/audit log read-only.
  const access = useMemo(() => {
    if (!project || !profile) return NO_ACCESS
    if (profile.role === 'admin' && project.companyId === profile.companyId) {
      return { canView: true, canManage: true, canPostUpdate: true }
    }
    if (profile.role === 'pm' && project.pmId === user?.uid) {
      return { canView: true, canManage: true, canPostUpdate: true }
    }
    if (profile.role === 'team_member' && project.pmId === profile.pmId) {
      return { canView: true, canManage: false, canPostUpdate: true }
    }
    if (profile.role === 'client' && project.clientId === user?.uid) {
      return { canView: true, canManage: false, canPostUpdate: true }
    }
    return NO_ACCESS
  }, [project, profile, user])

  const { library } = useStatusLibrary(project?.companyId, access.canManage)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading || (!project && !notFound)) {
    return <div className="min-h-screen flex items-center justify-center text-slate text-sm">Loading…</div>
  }

  if (notFound) {
    return <div className="min-h-screen flex items-center justify-center text-slate text-sm">Project not found.</div>
  }

  if (profile && !access.canView) {
    return <div className="min-h-screen flex items-center justify-center text-slate text-sm">You don&apos;t have access to this project.</div>
  }

  const { canManage, canPostUpdate } = access
  const stages = project.stages || []
  const activeStage = stages.find((s) => s.id === activeStageId) || stages[0] || null
  const currentUser = { uid: user?.uid, name: profile?.name, role: profile?.role }

  // Company library entries plus this project's own on-the-spot statuses
  // (added directly on this screen, never written back to Settings — see
  // addStatus below). Passed as "library" to RoadmapTimeline/StagePanel so
  // resolveStatusKind/getStatusDisplay resolve custom statuses for free.
  const effectiveLibrary = [...library, ...(project.customStatuses || [])]

  const statusOptions = project.statusSetIds?.length
    ? effectiveLibrary.filter((s) => project.statusSetIds.includes(s.id))
    : activeStatuses(effectiveLibrary)

  async function updateStages(nextStages) {
    setProject((p) => ({ ...p, stages: nextStages }))
    await updateDoc(doc(db, 'projects', id), { stages: nextStages })
  }

  function handleStageChange(updatedStage) {
    const next = stages.map((s) => (s.id === updatedStage.id ? updatedStage : s))
    updateStages(next)
  }

  function addStage() {
    const pendingId = statusOptions.find((s) => s.kind === STATUS_KINDS.PENDING)?.id || statusOptions[0]?.id
    const next = [...stages, newStage(stages.length, pendingId)]
    updateStages(next)
    setActiveStageId(next[next.length - 1].id)
  }

  function removeStage(stageId) {
    const next = stages.filter((s) => s.id !== stageId).map((s, i) => ({ ...s, order: i }))
    updateStages(next)
    if (activeStageId === stageId) setActiveStageId(next[0]?.id ?? null)
  }

  function moveStage(stageId, dir) {
    const idx = stages.findIndex((s) => s.id === stageId)
    const swapWith = idx + dir
    if (swapWith < 0 || swapWith >= stages.length) return
    const next = [...stages]
    ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
    updateStages(next.map((s, i) => ({ ...s, order: i })))
  }

  function logAction(action, description, stageId) {
    writeAuditLog(id, currentUser, action, description, stageId ? { stageId } : {})
  }

  // Admin/PM only (StagePanel gates the UI on canManage). Adds a status
  // scoped to this project only — stored on the project doc, never written
  // to the company's Settings status library, capped at MAX_PROJECT_STATUSES
  // total (library selections + custom) for this project.
  async function addStatus({ name, color, kind }) {
    if (!name?.trim() || statusOptions.length >= MAX_PROJECT_STATUSES) return
    const entry = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      color,
      kind,
      active: true,
    }
    const nextCustom = [...(project.customStatuses || []), entry]
    const nextSetIds = [...(project.statusSetIds?.length ? project.statusSetIds : statusOptions.map((s) => s.id)), entry.id]
    setProject((p) => ({ ...p, customStatuses: nextCustom, statusSetIds: nextSetIds }))
    await updateDoc(doc(db, 'projects', id), { customStatuses: nextCustom, statusSetIds: nextSetIds })
    logAction(AUDIT_ACTIONS.STATUS_ADDED, `Added a project-only status "${entry.name}"`)
  }

  async function updateDocuments(nextDocuments) {
    setProject((p) => ({ ...p, documents: nextDocuments }))
    await updateDoc(doc(db, 'projects', id), { documents: nextDocuments })
  }

  async function updateResources(nextResources) {
    setProject((p) => ({ ...p, resources: nextResources }))
    await updateDoc(doc(db, 'projects', id), { resources: nextResources })
  }

  async function createMom(stageId, draft) {
    await addDoc(collection(db, 'projects', id, 'momEntries'), {
      stageId,
      text: draft.text,
      meetingLink: draft.meetingLink || '',
      date: draft.date || null,
      status: MOM_STATUS.DRAFT,
      authorId: currentUser.uid,
      authorName: currentUser.name,
      createdAt: serverTimestamp(),
    })
    logAction(AUDIT_ACTIONS.MOM_CREATED, `Created a MOM draft on "${activeStage?.name}"`, stageId)
  }

  async function updateMom(momId, patch) {
    await updateDoc(doc(db, 'projects', id, 'momEntries', momId), patch)
  }

  async function deleteMom(momId) {
    await deleteDoc(doc(db, 'projects', id, 'momEntries', momId))
  }

  async function approveMom(momId) {
    const entry = momEntries.find((m) => m.id === momId)
    await updateDoc(doc(db, 'projects', id, 'momEntries', momId), {
      status: MOM_STATUS.APPROVED,
      approvedBy: currentUser.uid,
      approvedByName: currentUser.name,
      approvedAt: serverTimestamp(),
    })
    logAction(AUDIT_ACTIONS.MOM_APPROVED, `Approved MOM on "${activeStage?.name}"`, entry?.stageId)
  }

  const activeMomEntries = momEntries.filter((m) => m.stageId === activeStage?.id)

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="max-w-[1440px] mx-auto px-8 py-8">
        <h1 className="font-display text-[36px] leading-[1.2] font-bold text-ink tracking-tight mb-6">{project.name}</h1>

        <div className="flex gap-6 items-start">
          <aside className="w-72 flex-shrink-0 bg-surface/90 backdrop-blur border border-line rounded-card shadow-card p-6 flex flex-col gap-8 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <RoadmapTimeline stages={stages} activeStageId={activeStage?.id} onSelectStage={(s) => setActiveStageId(s.id)} library={effectiveLibrary} />

            <div className="border-t border-line pt-6">
              <ResourcesPanel resources={project.resources} onChange={updateResources} canManage={canManage} logAction={logAction} />
            </div>

            <div className="border-t border-line pt-6">
              <DocumentsPanel documents={project.documents} editable={canManage} onChange={updateDocuments} logAction={logAction} />
            </div>

            {canManage && activeStage && (
              <div className="border-t border-line pt-6 flex flex-col gap-2">
                <button onClick={() => moveStage(activeStage.id, -1)} className="text-sm font-semibold text-slate px-4 py-2.5 rounded-lg border border-line hover:border-ink/30 hover:text-ink transition-colors">
                  ↑ Move up
                </button>
                <button onClick={() => moveStage(activeStage.id, 1)} className="text-sm font-semibold text-slate px-4 py-2.5 rounded-lg border border-line hover:border-ink/30 hover:text-ink transition-colors">
                  Move down ↓
                </button>
                <button onClick={() => removeStage(activeStage.id)} className="text-sm font-semibold text-coral px-4 py-2.5 rounded-lg border border-coral-light hover:bg-coral-light transition-colors">
                  Remove stage
                </button>
              </div>
            )}
          </aside>

          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <StagePanel
              stage={activeStage}
              canManage={canManage}
              canPostUpdate={canPostUpdate}
              currentUser={currentUser}
              onChange={handleStageChange}
              logAction={logAction}
              statusOptions={statusOptions}
              onAddStatus={addStatus}
              maxStatuses={MAX_PROJECT_STATUSES}
              momEntries={activeMomEntries}
              onCreateMom={(draft) => createMom(activeStage.id, draft)}
              onUpdateMom={updateMom}
              onDeleteMom={deleteMom}
              onApproveMom={approveMom}
            />

            {canManage && (
              <button
                onClick={addStage}
                className="self-start flex items-center gap-2 text-sm font-semibold text-ink px-4 py-2.5 rounded-lg bg-paper border border-line hover:border-ink/30 transition-colors"
              >
                + Add stage
              </button>
            )}

            <AuditLogPanel entries={auditLog} />
          </div>
        </div>
      </main>
    </div>
  )
}
