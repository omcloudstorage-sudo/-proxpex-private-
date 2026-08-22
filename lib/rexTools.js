import { adminDb } from '@/lib/firebaseAdmin'
import { normalizeSections, ITEM_TYPES } from '@/lib/resources'
import { normalizeStage } from '@/lib/stages'
import { resolveStatusKind, STATUS_KINDS, DEFAULT_STATUSES } from '@/lib/statusLibrary'

const MAX_HITS = 15
const SNIPPET_LEN = 140

function contains(haystack, needle) {
  return typeof haystack === 'string' && haystack.toLowerCase().includes(needle)
}

function snippet(text) {
  if (!text) return ''
  return text.length > SNIPPET_LEN ? `${text.slice(0, SNIPPET_LEN)}…` : text
}

// A field holding a real secret (never sent to Gemini, never shown in chat).
function isSensitiveItemType(type) {
  return type === ITEM_TYPES.KEY || type === ITEM_TYPES.CREDENTIAL
}

// Every tool call is scoped from this — an Admin sees their whole company's
// projects, a PM sees only projects they're assigned to (pmId === their
// uid). Never trust a client-supplied scope; caller comes from the verified
// ID token + Firestore user doc.
async function accessibleProjects(caller) {
  const col = adminDb().collection('projects')
  const q = caller.role === 'admin'
    ? col.where('companyId', '==', caller.companyId)
    : col.where('pmId', '==', caller.uid)
  const snap = await q.get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function searchProxpex(caller, { query }) {
  const needle = (query || '').trim().toLowerCase()
  if (!needle) return { hits: [] }

  const projects = await accessibleProjects(caller)
  const hits = []

  function push(hit) {
    if (hits.length < MAX_HITS) hits.push(hit)
  }

  for (const project of projects) {
    if (hits.length >= MAX_HITS) break

    if (contains(project.name, needle)) {
      push({
        type: 'project',
        projectId: project.id,
        projectName: project.name,
        label: project.name,
        snippet: `Project${project.country ? ` · ${project.country}` : ''}`,
        sensitive: false,
        href: `/project/${project.id}`,
      })
    }

    const stages = (project.stages || []).map(normalizeStage)
    for (const stage of stages) {
      if (hits.length >= MAX_HITS) break

      if (contains(stage.name, needle)) {
        push({
          type: 'stage',
          projectId: project.id,
          projectName: project.name,
          label: `${project.name} · ${stage.name}`,
          snippet: 'Stage',
          sensitive: false,
          href: `/project/${project.id}?stage=${stage.id}`,
        })
      }

      for (const update of stage.updates || []) {
        if (hits.length >= MAX_HITS) break
        if (contains(update.text, needle)) {
          push({
            type: 'team_update',
            projectId: project.id,
            projectName: project.name,
            label: `${project.name} · ${stage.name} · Team update by ${update.authorName || 'Unknown'}`,
            snippet: snippet(update.text),
            sensitive: false,
            href: `/project/${project.id}?stage=${stage.id}`,
          })
        }
      }
    }

    for (const doc of project.documents || []) {
      if (hits.length >= MAX_HITS) break
      if (contains(doc.label, needle)) {
        push({
          type: 'document',
          projectId: project.id,
          projectName: project.name,
          label: `${project.name} · Document · ${doc.label}`,
          snippet: doc.type || 'Document',
          sensitive: false,
          href: `/project/${project.id}?section=documents`,
        })
      }
    }

    const sections = normalizeSections(project.resources)
    for (const section of sections) {
      for (const item of section.items || []) {
        if (hits.length >= MAX_HITS) break
        const nameField = item.name || item.label || ''
        const usernameMatch = item.type === ITEM_TYPES.CREDENTIAL && contains(item.username, needle)
        if (!contains(nameField, needle) && !usernameMatch) continue

        const sensitive = isSensitiveItemType(item.type)
        const label = `${project.name} · Requirements · ${section.name} · ${nameField || item.type}`
        const href = `/project/${project.id}?section=resources&resourceSection=${section.id}&resourceItem=${item.id}`

        if (sensitive) {
          // Confirm existence only — the actual secret value never leaves
          // Firestore/this function; it's never included in what we tell
          // Gemini or the user.
          push({ type: 'requirement_field', projectId: project.id, projectName: project.name, label, snippet: null, sensitive: true, href })
        } else {
          const detail = item.type === ITEM_TYPES.LINK ? item.url : item.notes
          push({ type: 'requirement_field', projectId: project.id, projectName: project.name, label, snippet: snippet(detail), sensitive: false, href })
        }
      }
    }
  }

  // MOM entries live in a subcollection per project — fetch only for
  // projects still under the hit cap, in parallel.
  const momTargets = projects.filter(() => hits.length < MAX_HITS)
  await Promise.all(
    momTargets.map(async (project) => {
      const snap = await adminDb().collection('projects').doc(project.id).collection('momEntries').get()
      for (const d of snap.docs) {
        if (hits.length >= MAX_HITS) break
        const mom = d.data()
        if (contains(mom.text, needle)) {
          const stage = (project.stages || []).find((s) => s.id === mom.stageId)
          push({
            type: 'mom_entry',
            projectId: project.id,
            projectName: project.name,
            label: `${project.name} · ${stage?.name || 'Stage'} · MOM by ${mom.authorName || 'Unknown'}`,
            snippet: snippet(mom.text),
            sensitive: false,
            href: `/project/${project.id}?stage=${mom.stageId || ''}`,
          })
        }
      }
    })
  )

  return { hits }
}

const FILTERS = ['overdue', 'due_this_week', 'due_this_month', 'in_progress', 'done', 'pending', 'all']

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function withinDays(dueDate, days) {
  if (!dueDate) return false
  const due = startOfDay(dueDate)
  const now = startOfDay(new Date())
  const end = new Date(now)
  end.setDate(end.getDate() + days)
  return due >= now && due <= end
}

export async function getProjectStatus(caller, { filter, projectName }) {
  const safeFilter = FILTERS.includes(filter) ? filter : 'all'
  let projects = await accessibleProjects(caller)

  if (projectName) {
    const needle = projectName.trim().toLowerCase()
    projects = projects.filter((p) => contains(p.name, needle))
  }

  // Resolve each stage's status "kind" (pending/in_progress/done) the same
  // way the UI does: company status library + this project's own
  // custom statuses, falling back to the legacy fixed IDs.
  const companyLibraries = new Map()
  async function libraryFor(companyId) {
    if (companyLibraries.has(companyId)) return companyLibraries.get(companyId)
    const snap = await adminDb().collection('companies').doc(companyId).collection('statusLibrary').get()
    const lib = snap.docs.length ? snap.docs.map((d) => ({ id: d.id, ...d.data() })) : DEFAULT_STATUSES
    companyLibraries.set(companyId, lib)
    return lib
  }

  const results = []
  for (const project of projects) {
    const library = [...(await libraryFor(project.companyId)), ...(project.customStatuses || [])]
    const stages = (project.stages || []).map(normalizeStage)

    for (const stage of stages) {
      const kind = resolveStatusKind(stage.status, library)
      const now = startOfDay(new Date())
      const due = stage.dueDate ? startOfDay(stage.dueDate) : null
      const isOverdue = due && due < now && kind !== STATUS_KINDS.DONE

      let include = false
      if (safeFilter === 'all') include = true
      else if (safeFilter === 'overdue') include = isOverdue
      else if (safeFilter === 'due_this_week') include = withinDays(stage.dueDate, 7) && kind !== STATUS_KINDS.DONE
      else if (safeFilter === 'due_this_month') include = withinDays(stage.dueDate, 30) && kind !== STATUS_KINDS.DONE
      else include = kind === safeFilter

      if (!include) continue
      results.push({
        projectId: project.id,
        projectName: project.name,
        stageId: stage.id,
        stageName: stage.name,
        status: kind,
        dueDate: stage.dueDate || null,
        overdue: !!isOverdue,
        href: `/project/${project.id}?stage=${stage.id}`,
      })
    }
  }

  return { filter: safeFilter, count: results.length, stages: results.slice(0, MAX_HITS) }
}

// Resolves the project the user was actually looking at when they opened
// Rex (see RexWidget's pageContext), so "what's overdue here" can resolve
// without them naming the project. Same access rule as accessibleProjects
// above, just applied to a single doc instead of a full scan.
export async function resolvePageProject(caller, projectId) {
  if (!projectId) return null
  const snap = await adminDb().collection('projects').doc(projectId).get()
  if (!snap.exists) return null
  const project = snap.data()
  const allowed = caller.role === 'admin' ? project.companyId === caller.companyId : project.pmId === caller.uid
  if (!allowed) return null
  return { projectId, projectName: project.name }
}

export const REX_TOOL_DECLARATIONS = [
  {
    name: 'search_proxpex',
    description:
      "Search across the user's accessible projects, stages, meeting notes (MOM), team updates, requirement fields, and documents for a keyword or phrase. Use this whenever the user is trying to locate or find something specific in Proxpex.",
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Keyword or phrase to search for.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_project_status',
    description:
      "Answer natural-language questions about project or stage status for the user's accessible projects (e.g. what's overdue, due this week, in progress, done). Always call this instead of guessing — never fabricate dates, counts, or statuses.",
    parameters: {
      type: 'OBJECT',
      properties: {
        filter: {
          type: 'STRING',
          enum: FILTERS,
          description: 'Which subset of stages to return.',
        },
        projectName: {
          type: 'STRING',
          description: 'Optional: restrict to one project by name (partial match is fine).',
        },
      },
      required: ['filter'],
    },
  },
]

export async function executeRexTool(caller, name, args) {
  if (name === 'search_proxpex') return searchProxpex(caller, args || {})
  if (name === 'get_project_status') return getProjectStatus(caller, args || {})
  throw new Error(`Unknown tool: ${name}`)
}
