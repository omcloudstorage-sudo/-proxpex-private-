import { adminDb } from '@/lib/firebaseAdmin'
import { normalizeSections, ITEM_TYPES } from '@/lib/resources'
import { normalizeStage } from '@/lib/stages'
import { resolveStatusKind, getStatusDisplay, STATUS_KINDS, DEFAULT_STATUSES } from '@/lib/statusLibrary'

const MAX_HITS = 15
const SNIPPET_LEN = 140
// Caps on how much of one project's history get pulled per get_project_details
// call — bounds token cost while still covering "last/latest" style asks,
// which only ever need the most recent handful of entries.
const MAX_LOG_ENTRIES = 20

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

function toIso(ts) {
  if (!ts) return null
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString()
  if (typeof ts === 'string') return ts
  return null
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

// People the caller can see, same scoping spirit as accessibleProjects: an
// Admin sees the whole company roster; a PM sees the (shared, company-wide)
// client roster plus only the team members they themselves added — not
// other PMs' team members, and not other PMs.
async function accessiblePeople(caller, projects) {
  const col = adminDb().collection('users')
  if (caller.role === 'admin') {
    const snap = await col.where('companyId', '==', caller.companyId).get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.id !== caller.uid)
  }

  const clientIds = [...new Set(projects.map((p) => p.clientId).filter(Boolean))]
  const [teamSnap, clientDocs] = await Promise.all([
    col.where('companyId', '==', caller.companyId).where('role', '==', 'team_member').where('pmId', '==', caller.uid).get(),
    Promise.all(clientIds.map((id) => col.doc(id).get())),
  ])
  const team = teamSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const clients = clientDocs.filter((d) => d.exists).map((d) => ({ id: d.id, ...d.data() }))
  return [...team, ...clients]
}

// UNIVERSAL ENTITY RESOLUTION (principle 1): no server-side name matching
// happens here at all — this just returns every project and person the
// caller can see (id, name, role, and which project(s) they're linked to),
// and lets Gemini match the user's wording against the real roster itself.
// That's what makes "david" resolve correctly whether David is a project,
// a client, or a PM, without any bespoke "looks like a person" branching.
// Cheap by construction: only names/ids, never full records, so this stays
// small even at a few hundred projects/people.
export async function listAccessibleEntities(caller) {
  const projects = await accessibleProjects(caller)
  const people = await accessiblePeople(caller, projects)

  const projectsByPm = new Map()
  const projectsByClient = new Map()
  for (const p of projects) {
    if (p.pmId) projectsByPm.set(p.pmId, [...(projectsByPm.get(p.pmId) || []), { id: p.id, name: p.name }])
    if (p.clientId) projectsByClient.set(p.clientId, [...(projectsByClient.get(p.clientId) || []), { id: p.id, name: p.name }])
  }

  return {
    projects: projects.map((p) => ({ id: p.id, name: p.name, country: p.country || null })),
    people: people.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      linkedProjects:
        u.role === 'client' ? projectsByClient.get(u.id) || []
        : u.role === 'pm' ? projectsByPm.get(u.id) || []
        : u.role === 'team_member' ? projectsByPm.get(u.pmId) || []
        : [],
    })),
  }
}

function assertProjectAccess(caller, project) {
  const allowed = caller.role === 'admin' ? project.companyId === caller.companyId : project.pmId === caller.uid
  if (!allowed) throw new Error('Project not found or not accessible.')
}

// FETCH CANDIDATES, LET THE MODEL REASON (principles 2 & 3): everything
// about one resolved project that a typical question could be about —
// stages, requirement fields, documents, MOM, audit log, team updates,
// invoices — as real candidate data with real names and real timestamps.
// No literal string matching against the user's wording happens here;
// Gemini reads this and semantically matches "google key" against actual
// field names, or picks the newest entry off a pre-sorted list for
// "last"/"latest". Scoped to exactly one project (not the whole company)
// to keep token cost bounded per principle 4.
export async function getProjectDetails(caller, { projectId } = {}) {
  if (!projectId) throw new Error('projectId is required.')
  const snap = await adminDb().collection('projects').doc(projectId).get()
  if (!snap.exists) throw new Error('Project not found or not accessible.')
  const project = { id: snap.id, ...snap.data() }
  assertProjectAccess(caller, project)

  const librarySnap = await adminDb().collection('companies').doc(project.companyId).collection('statusLibrary').get()
  const library = [...(librarySnap.docs.length ? librarySnap.docs.map((d) => ({ id: d.id, ...d.data() })) : DEFAULT_STATUSES), ...(project.customStatuses || [])]

  const stages = (project.stages || []).map(normalizeStage)
  const stageName = (id) => stages.find((s) => s.id === id)?.name || null

  const resourceSections = normalizeSections(project.resources).map((section) => ({
    id: section.id,
    name: section.name,
    items: (section.items || []).map((item) => {
      const sensitive = isSensitiveItemType(item.type)
      return {
        id: item.id,
        name: item.name || item.label || item.type,
        type: item.type,
        sensitive,
        // Never the actual secret — only enough to identify the field.
        detail: sensitive ? null : item.type === ITEM_TYPES.LINK ? item.url : item.notes || null,
        href: `/project/${project.id}?section=resources&resourceSection=${section.id}&resourceItem=${item.id}`,
      }
    }),
  }))

  const documents = (project.documents || []).map((doc) => ({
    id: doc.id,
    label: doc.label,
    type: doc.type,
    href: `/project/${project.id}?section=documents`,
  }))

  const [momSnap, auditSnap] = await Promise.all([
    adminDb().collection('projects').doc(project.id).collection('momEntries').get(),
    adminDb().collection('projects').doc(project.id).collection('auditLog').orderBy('createdAt', 'desc').limit(MAX_LOG_ENTRIES).get(),
  ])

  const momEntries = momSnap.docs
    .map((d) => {
      const m = d.data()
      return {
        id: d.id,
        text: snippet(m.text),
        authorName: m.authorName || 'Unknown',
        status: m.status || null,
        stageId: m.stageId || null,
        stageName: stageName(m.stageId),
        createdAt: toIso(m.createdAt),
        href: `/project/${project.id}?stage=${m.stageId || ''}`,
      }
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, MAX_LOG_ENTRIES)

  const auditLog = auditSnap.docs.map((d) => {
    const a = d.data()
    return {
      description: a.description,
      actorName: a.actorName || 'Unknown',
      action: a.action,
      stageId: a.stageId || null,
      stageName: stageName(a.stageId),
      createdAt: toIso(a.createdAt),
      href: `/project/${project.id}${a.stageId ? `?stage=${a.stageId}` : ''}`,
    }
  })

  const teamUpdates = stages
    .flatMap((stage) =>
      (stage.updates || []).map((u) => ({
        text: snippet(u.text),
        authorName: u.authorName || 'Unknown',
        stageId: stage.id,
        stageName: stage.name,
        createdAt: toIso(u.createdAt),
        href: `/project/${project.id}?stage=${stage.id}`,
      }))
    )
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, MAX_LOG_ENTRIES)

  const invoices = stages
    .flatMap((stage) =>
      (stage.invoices || []).map((inv) => ({
        label: inv.label,
        amount: inv.amount,
        dueDate: inv.dueDate || null,
        status: inv.status,
        stageId: stage.id,
        stageName: stage.name,
        href: `/project/${project.id}?stage=${stage.id}`,
      }))
    )
    .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''))

  return {
    project: { id: project.id, name: project.name, country: project.country || null, href: `/project/${project.id}` },
    // Stage list doubles as the "temporal" surface for due dates — already
    // sorted so "next due" / "most overdue" reasoning has a stable order.
    stages: [...stages]
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
      .map((s) => ({
        id: s.id,
        name: s.name,
        status: getStatusDisplay(s.status, library).name,
        dueDate: s.dueDate || null,
        completedAt: s.completedAt || null,
        href: `/project/${project.id}?stage=${s.id}`,
      })),
    resourceSections,
    documents,
    momEntries, // newest first
    auditLog, // newest first
    teamUpdates, // newest first
    invoices, // soonest/most-recent due date first
  }
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

export async function getProjectStatus(caller, { filter, projectId, projectName }) {
  const safeFilter = FILTERS.includes(filter) ? filter : 'all'
  let projects = await accessibleProjects(caller)

  if (projectId) {
    projects = projects.filter((p) => p.id === projectId)
  } else if (projectName) {
    const needle = projectName.trim().toLowerCase()
    projects = projects.filter((p) => contains(p.name, needle))
  }

  // Resolve each stage's status "kind" the same way the UI does: company
  // status library + this project's own custom statuses, falling back to
  // the legacy fixed IDs.
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
    name: 'list_accessible_entities',
    description:
      "Lists every project and every person (PM, client, team member) the user can see, with names, roles, and which project(s) each person is linked to. Call this FIRST whenever the user's message names or refers to something — a project, a client, a PM, a team member, or an ambiguous name that could be any of those — that you haven't already resolved to a real id this conversation. Never guess which entity type a name refers to; this tells you for real. No filtering happens here — you match the user's wording against the returned names yourself (they don't have to match exactly: partial names, nicknames, and minor misspellings are still resolvable this way).",
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'get_project_details',
    description:
      "Fetches everything about ONE resolved project: its stages (with status and due dates), Requirements fields (names only — never secret values), documents, MOM entries, audit log, team updates, and invoices. MOM entries, audit log, and team updates are pre-sorted newest first; invoices are sorted by due date. Use this for any question about a specific project's fields, documents, stages, logs, updates, or invoices — including ones with words like 'last', 'latest', 'recent', 'first', or 'oldest' (apply that word yourself to the relevant pre-sorted list; don't ask for a differently-filtered fetch). Match the user's wording against the real names/labels returned here semantically — a field named 'Google Cloud API Key' should match a request for 'the google key' even though the words don't line up exactly.",
    parameters: {
      type: 'OBJECT',
      properties: {
        projectId: { type: 'STRING', description: "The project's id, from list_accessible_entities or a prior tool result." },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'search_proxpex',
    description:
      "Broad keyword search across every accessible project's stages, MOM, team updates, requirement fields, and documents at once. Use this when the user hasn't named a specific project or person — a general 'find X' request — not as a substitute for list_accessible_entities + get_project_details once you know which project is relevant.",
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
      "Answer natural-language questions about STRUCTURED stage status filters specifically (overdue, due this week/month, in progress, done, pending) — this does real date math, so prefer it over get_project_details for exactly this kind of filtered status question. Always call this instead of guessing — never fabricate dates, counts, or statuses.",
    parameters: {
      type: 'OBJECT',
      properties: {
        filter: {
          type: 'STRING',
          enum: FILTERS,
          description: 'Which subset of stages to return.',
        },
        projectId: {
          type: 'STRING',
          description: 'Optional: restrict to one project by id (preferred once resolved via list_accessible_entities).',
        },
        projectName: {
          type: 'STRING',
          description: 'Optional: restrict to one project by name (partial match) if you don\'t have its id yet.',
        },
      },
      required: ['filter'],
    },
  },
  {
    name: 'answer',
    description:
      "Call this to deliver your final answer — always, instead of ever just returning plain text as your last turn. `links` must contain ONLY the specific href(s) that are what you're actually telling the user about — the one field, document, MOM entry, log entry, invoice, or stage you named as the answer — copied exactly from an href you already saw in an earlier tool result. Never include every stage or every field just because a tool returned them; a generic list buries the one link that actually matters. If the answer is general project status with no single specific item, the project's own href (and relevant stage hrefs, if any) is the right link. If you can't deep-link to the exact thing (e.g. one specific audit log line has no page of its own), link to the closest real page you have — its stage, or the project — and say so plainly in the text rather than implying a more precise destination than what's actually provided.",
    parameters: {
      type: 'OBJECT',
      properties: {
        text: { type: 'STRING', description: 'The prose answer shown to the user, following every voice/formatting rule from the system prompt.' },
        links: {
          type: 'ARRAY',
          description: 'Zero or more links directly relevant to this specific answer. Every href must be copied verbatim from a tool result — never invented or guessed.',
          items: {
            type: 'OBJECT',
            properties: {
              label: { type: 'STRING' },
              href: { type: 'STRING' },
              sensitive: { type: 'BOOLEAN' },
            },
            required: ['label', 'href'],
          },
        },
      },
      required: ['text', 'links'],
    },
  },
]

export async function executeRexTool(caller, name, args) {
  if (name === 'list_accessible_entities') return listAccessibleEntities(caller)
  if (name === 'get_project_details') return getProjectDetails(caller, args || {})
  if (name === 'search_proxpex') return searchProxpex(caller, args || {})
  if (name === 'get_project_status') return getProjectStatus(caller, args || {})
  throw new Error(`Unknown tool: ${name}`)
}
