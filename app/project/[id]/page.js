'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  doc, onSnapshot, updateDoc, collection, query, where, orderBy, limit,
  addDoc, deleteDoc, getDocs, serverTimestamp,
} from 'firebase/firestore'
import { ClipboardList, FileText, MessageSquare, History } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import TopNav from '@/components/TopNav'
import RoadmapTimeline from '@/components/RoadmapTimeline'
import StagePanel, { MomPanel } from '@/components/StagePanel'
import KanbanBoard from '@/components/KanbanBoard'
import TaskDetailModal from '@/components/TaskDetailModal'
import TeamUpdatesPanel from '@/components/TeamUpdatesPanel'
import AuditLogPanel from '@/components/AuditLogPanel'
import DocumentsPanel from '@/components/DocumentsPanel'
import ResourcesPanel from '@/components/ResourcesPanel'
import ProgressBar from '@/components/ProgressBar'
import CollapsibleSection from '@/components/CollapsibleSection'
import { newStage } from '@/lib/stages'
import { newTeamUpdate, migrateStageUpdatesToProjectFeed } from '@/lib/teamUpdates'
import { newTaskDraft, isSubtask } from '@/lib/tasks'
import { countryOptions, findCountry } from '@/lib/countries'
import { MOM_STATUS } from '@/lib/momEntries'
import { AUDIT_ACTIONS, logAction as writeAuditLog } from '@/lib/auditLog'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { usePriorityLibrary } from '@/lib/usePriorityLibrary'
import { DEFAULT_PRIORITY_ID } from '@/lib/priorityLibrary'
import { useKanbanColumns } from '@/lib/useKanbanColumns'
import { useFeatureVisibility } from '@/lib/useFeatureVisibility'
import { isFeatureVisible } from '@/lib/featureVisibility'
import { useProjectTeam } from '@/lib/useProjectTeam'
import { activeStatuses, resolveStatusKind, STATUS_KINDS, MAX_PROJECT_STATUSES } from '@/lib/statusLibrary'

const NO_ACCESS = { canView: false, canManage: false, canPostUpdate: false, canManageTasks: false }

function formatLastUpdated(ts) {
  const date = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts)
  if (Number.isNaN(date?.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate text-sm">Loading…</div>}>
      <ProjectDetailPageInner />
    </Suspense>
  )
}

function ProjectDetailPageInner() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [project, setProject] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [activeStageId, setActiveStageId] = useState(null)
  const [momEntries, setMomEntries] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [tasks, setTasks] = useState([])
  const [teamUpdates, setTeamUpdates] = useState([])
  const [openTaskId, setOpenTaskId] = useState(null)
  const migrationRan = useRef(false)

  // Deep-link params — set by Rex's search results (and shareable in
  // general): ?stage= selects a stage, ?section=resources|documents jumps
  // to that panel, ?resourceSection=&resourceItem= focuses one requirements
  // field within the (already-expanded) Resources modal.
  const stageParam = searchParams.get('stage')
  const sectionParam = searchParams.get('section')
  const resourceItemParam = searchParams.get('resourceItem')

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
        setActiveStageId((current) => {
          if (current) return current
          const stages = data.stages || []
          if (stageParam && stages.some((s) => s.id === stageParam)) return stageParam
          return stages[0]?.id ?? null
        })
      },
      () => setNotFound(true)
    )
    return unsub
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sectionParam !== 'documents') return
    const el = document.getElementById('documents-panel')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [sectionParam, project])

  useEffect(() => {
    if (!id) return
    const unsubMom = onSnapshot(collection(db, 'projects', id, 'momEntries'), (snap) => {
      setMomEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    const unsubLog = onSnapshot(
      query(collection(db, 'projects', id, 'auditLog'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => setAuditLog(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    const unsubTasks = onSnapshot(collection(db, 'projects', id, 'tasks'), (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    const unsubUpdates = onSnapshot(
      query(collection(db, 'projects', id, 'teamUpdates'), orderBy('createdAt', 'desc')),
      (snap) => setTeamUpdates(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    return () => {
      unsubMom()
      unsubLog()
      unsubTasks()
      unsubUpdates()
    }
  }, [id])

  // canManage: edit stage name/status/dates and Documents & Links, create MOM entries.
  // canManageTasks: create/edit/move/delete tasks on the Sprint board — Admin,
  // the assigned PM, and that PM's team members (never Client).
  // canPostUpdate: post to the project-wide Team Updates feed.
  const access = useMemo(() => {
    if (!project || !profile) return NO_ACCESS
    if (profile.role === 'admin' && project.companyId === profile.companyId) {
      return { canView: true, canManage: true, canPostUpdate: true, canManageTasks: true }
    }
    if (profile.role === 'pm' && project.pmId === user?.uid) {
      return { canView: true, canManage: true, canPostUpdate: true, canManageTasks: true }
    }
    if (profile.role === 'team_member' && project.pmId === profile.pmId) {
      return { canView: true, canManage: false, canPostUpdate: true, canManageTasks: true }
    }
    if (profile.role === 'client' && project.clientId === user?.uid) {
      return { canView: true, canManage: false, canPostUpdate: true, canManageTasks: false }
    }
    return NO_ACCESS
  }, [project, profile, user])

  const { library } = useStatusLibrary(project?.companyId, access.canManage)
  const { library: priorityLibrary } = usePriorityLibrary(project?.companyId, access.canManage)
  const { columns: kanbanColumns } = useKanbanColumns(project?.companyId, access.canManage)
  const { library: featureLibrary } = useFeatureVisibility(project?.companyId, access.canManage)
  const { assignees } = useProjectTeam(project?.pmId)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // One-time migration of legacy per-stage Team Updates into the new
  // project-wide feed. Gated to canManage (Admin/PM) so a Client/team
  // member never attempts a write here; the migration itself is a no-op
  // if the feed already has entries (see migrateStageUpdatesToProjectFeed).
  useEffect(() => {
    if (!project || !access.canManage || migrationRan.current) return
    migrationRan.current = true
    migrateStageUpdatesToProjectFeed(id, project.stages || [], { uid: user.uid, name: profile.name })
  }, [project, access.canManage, id, user, profile])

  if (authLoading || (!project && !notFound)) {
    return <div className="min-h-screen flex items-center justify-center text-slate text-sm">Loading…</div>
  }

  if (notFound) {
    return <div className="min-h-screen flex items-center justify-center text-slate text-sm">Project not found.</div>
  }

  if (profile && !access.canView) {
    return <div className="min-h-screen flex items-center justify-center text-slate text-sm">You don&apos;t have access to this project.</div>
  }

  const { canManage, canPostUpdate, canManageTasks } = access
  const stages = project.stages || []
  const activeStage = stages.find((s) => s.id === activeStageId) || stages[0] || null
  const currentUser = { uid: user?.uid, name: profile?.name, role: profile?.role }
  const sprintPlannerVisible = isFeatureVisible('sprintPlanner', featureLibrary, profile?.role)

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

  async function updateCountry(nextCountry) {
    setProject((p) => ({ ...p, country: nextCountry }))
    await updateDoc(doc(db, 'projects', id), { country: nextCountry })
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

  // --- Team Updates (project-wide feed) ---
  async function postTeamUpdate(draft) {
    await addDoc(collection(db, 'projects', id, 'teamUpdates'), { ...newTeamUpdate(currentUser), ...draft })
    logAction(AUDIT_ACTIONS.TEAM_UPDATE_POSTED, `Posted a team update${draft.stageName ? ` on "${draft.stageName}"` : ''}`)
  }
  async function editTeamUpdate(updateId, patch) {
    await updateDoc(doc(db, 'projects', id, 'teamUpdates', updateId), patch)
  }
  async function deleteTeamUpdate(updateId) {
    await deleteDoc(doc(db, 'projects', id, 'teamUpdates', updateId))
  }

  // --- Tasks / subtasks (Sprint board) ---
  async function createTask(stageId, parentTaskId = null, status = null) {
    const parentTitle = parentTaskId ? tasks.find((t) => t.id === parentTaskId)?.title : null
    const ref = await addDoc(collection(db, 'projects', id, 'tasks'), {
      ...newTaskDraft({ priorityId: DEFAULT_PRIORITY_ID, stageId, parentTaskId, status }),
      createdBy: currentUser.uid,
      createdByName: currentUser.name,
      createdAt: serverTimestamp(),
    })
    if (parentTaskId) {
      logAction(AUDIT_ACTIONS.SUBTASK_CREATED, `Added a subtask under "${parentTitle || 'a task'}"`, stageId)
    } else {
      logAction(AUDIT_ACTIONS.TASK_CREATED, `Created a new task on "${activeStage?.name}"`, stageId)
    }
    return ref.id
  }

  async function updateTask(taskId, patch) {
    const task = tasks.find((t) => t.id === taskId)
    await updateDoc(doc(db, 'projects', id, 'tasks', taskId), patch)
    if (!task) return
    if (patch.status && patch.status !== task.status) {
      logAction(AUDIT_ACTIONS.TASK_STATUS_CHANGED, `Moved "${task.title || 'a task'}" to ${patch.status.replace('_', ' ')}`, task.stageId)
    }
    if (patch.assigneeIds) {
      const names = patch.assigneeIds.map((aid) => assignees.find((a) => a.id === aid)?.name).filter(Boolean)
      logAction(AUDIT_ACTIONS.TASK_ASSIGNED, `Assigned "${task.title || 'a task'}" to ${names.join(', ') || 'no one'}`, task.stageId)
    }
  }

  async function deleteTask(taskId) {
    const task = tasks.find((t) => t.id === taskId)
    if (!isSubtask(task)) {
      const childSnap = await getDocs(query(collection(db, 'projects', id, 'tasks'), where('parentTaskId', '==', taskId)))
      await Promise.all(childSnap.docs.map((d) => deleteDoc(d.ref)))
    }
    await deleteDoc(doc(db, 'projects', id, 'tasks', taskId))
    if (openTaskId === taskId) setOpenTaskId(null)
    logAction(AUDIT_ACTIONS.TASK_DELETED, `Deleted "${task?.title || 'a task'}"`, task?.stageId)
  }

  function moveTask(taskId, status) {
    updateTask(taskId, { status })
  }

  function logCommentPosted(task) {
    logAction(AUDIT_ACTIONS.TASK_COMMENT_POSTED, `Commented on "${task.title || 'a task'}"`, task.stageId)
  }

  const activeMomEntries = momEntries.filter((m) => m.stageId === activeStage?.id)
  const activeStageTasks = tasks.filter((t) => t.stageId === activeStage?.id && !t.parentTaskId)
  const subtasksByParent = tasks.reduce((acc, t) => {
    if (!t.parentTaskId) return acc
    acc[t.parentTaskId] = acc[t.parentTaskId] || []
    acc[t.parentTaskId].push(t)
    return acc
  }, {})
  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) : null

  const doneStages = stages.filter((s) => resolveStatusKind(s.status, effectiveLibrary) === STATUS_KINDS.DONE).length
  const progressPct = stages.length ? Math.round((doneStages / stages.length) * 100) : 0
  const lastUpdatedAt = auditLog[0]?.createdAt

  return (
    <div className="min-h-screen page-fade">
      <TopNav />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="font-display text-[28px] sm:text-[36px] leading-[1.2] font-bold text-ink tracking-tight">{project.name}</h1>
            <div className="mt-1">
              {canManage ? (
                <select
                  value={project.country || ''}
                  onChange={(e) => updateCountry(e.target.value)}
                  className="text-sm text-slate bg-transparent border border-line rounded-lg px-2 py-1 outline-none focus:border-signal"
                >
                  <option value="">No country set</option>
                  {countryOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                project.country && <span className="text-sm text-slate">{findCountry(project.country)?.name}</span>
              )}
            </div>
          </div>
          {lastUpdatedAt && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-light mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-progress glow-pulse" />
              Last updated {formatLastUpdated(lastUpdatedAt)}
            </span>
          )}
        </div>

        <div className="bg-surface/90 backdrop-blur border border-line rounded-card shadow-card p-6 mb-6">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-slate font-semibold uppercase tracking-wide">{doneStages} of {stages.length} stages done</span>
            <span className="text-progress font-bold">{progressPct}%</span>
          </div>
          <ProgressBar pct={progressPct} className="h-2 mb-5" />

          <RoadmapTimeline stages={stages} activeStageId={activeStage?.id} onSelectStage={(s) => setActiveStageId(s.id)} library={effectiveLibrary} orientation="horizontal" />

          <div className="flex items-center gap-2 mt-5 flex-wrap">
            {canManage && (
              <button
                onClick={addStage}
                className="flex items-center gap-2 text-sm font-semibold text-ink px-4 py-2 rounded-lg bg-paper border border-line hover:border-ink/30 transition-colors"
              >
                + Add stage
              </button>
            )}
            {canManage && activeStage && (
              <>
                <button onClick={() => moveStage(activeStage.id, -1)} className="text-sm font-semibold text-slate px-4 py-2 rounded-lg border border-line hover:border-ink/30 hover:text-ink transition-colors">
                  ← Move
                </button>
                <button onClick={() => moveStage(activeStage.id, 1)} className="text-sm font-semibold text-slate px-4 py-2 rounded-lg border border-line hover:border-ink/30 hover:text-ink transition-colors">
                  Move →
                </button>
                <button onClick={() => removeStage(activeStage.id)} className="text-sm font-semibold text-coral px-4 py-2 rounded-lg border border-coral-light hover:bg-coral-light transition-colors">
                  Remove stage
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 mb-6">
          <StagePanel
            stage={activeStage}
            canManage={canManage}
            currentUser={currentUser}
            onChange={handleStageChange}
            logAction={logAction}
            statusOptions={statusOptions}
            onAddStatus={addStatus}
            maxStatuses={MAX_PROJECT_STATUSES}
          />

          {sprintPlannerVisible && activeStage && (
            <KanbanBoard
              tasks={activeStageTasks}
              subtasksByParent={subtasksByParent}
              priorityLibrary={priorityLibrary}
              assignees={assignees}
              columns={kanbanColumns}
              companyId={project.companyId}
              canManage={canManageTasks}
              onOpenTask={(t) => setOpenTaskId(t.id)}
              onCreateTask={async (columnId) => setOpenTaskId(await createTask(activeStage.id, null, columnId))}
              onMoveTask={moveTask}
            />
          )}

          <CollapsibleSection icon={ClipboardList} title="Requirements & Credentials" defaultOpen={false}>
            <ResourcesPanel
              resources={project.resources}
              onChange={updateResources}
              canManage={canManage}
              logAction={logAction}
              autoOpen={sectionParam === 'resources'}
              focusItemId={resourceItemParam}
            />
          </CollapsibleSection>

          <div id="documents-panel">
            <CollapsibleSection icon={FileText} title="Documents" defaultOpen={sectionParam === 'documents'}>
              <DocumentsPanel documents={project.documents} editable={canManage} onChange={updateDocuments} logAction={logAction} />
            </CollapsibleSection>
          </div>

          <CollapsibleSection icon={ClipboardList} title="MOM" defaultOpen={false}>
            <div className="h-[400px] flex flex-col">
              <MomPanel
                entries={activeMomEntries}
                canManage={canManage}
                currentUser={currentUser}
                onCreate={(draft) => createMom(activeStage.id, draft)}
                onUpdate={updateMom}
                onDelete={deleteMom}
                onApprove={approveMom}
                onSubmit={(momId) => updateMom(momId, { status: MOM_STATUS.PENDING })}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection icon={MessageSquare} title="Team Updates" defaultOpen={false}>
            <TeamUpdatesPanel
              updates={teamUpdates}
              canPost={canPostUpdate}
              currentUser={currentUser}
              onPost={postTeamUpdate}
              onEdit={editTeamUpdate}
              onDelete={deleteTeamUpdate}
              stages={stages}
              bare
            />
          </CollapsibleSection>

          <CollapsibleSection icon={History} title="Audit Log" defaultOpen={false}>
            <AuditLogPanel entries={auditLog} bare />
          </CollapsibleSection>
        </div>
      </main>

      {openTask && (
        <TaskDetailModal
          projectId={id}
          task={openTask}
          allTasks={tasks}
          priorityLibrary={priorityLibrary}
          assignees={assignees}
          columns={kanbanColumns}
          currentUser={currentUser}
          canManage={canManageTasks}
          onClose={() => setOpenTaskId(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onCreateSubtask={(parentTaskId) => createTask(activeStage.id, parentTaskId)}
          onCommentLogged={logCommentPosted}
        />
      )}
    </div>
  )
}
