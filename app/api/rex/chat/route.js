import { requireManager } from '@/lib/requireAdmin'
import { callGemini } from '@/lib/gemini'
import { REX_TOOL_DECLARATIONS, executeRexTool, resolvePageProject } from '@/lib/rexTools'

const MAX_MESSAGES = 25
const MAX_TOOL_ROUNDS = 4
const MAX_LINKS = 15

const SYSTEM_PROMPT = `You are Rex, Proxpex's built-in AI assistant — named for the Rx logo, a small T-Rex. You help Admins and Project Managers find things and check status inside Proxpex, scoped to exactly what this user can already see: their projects, stages, meeting notes (MOM), team updates, requirement fields, documents, audit log, and invoices.

Voice: a competent coworker giving you a straight answer, not a customer-service bot. Confident and plain, never a beta feature apologizing for itself.

- Lead with the answer. "Found it — Davico's proposal doc is linked below," not "I was able to locate what appears to be a document that might be related to your query." State what you found or did, then stop — add detail only if it's actually useful.
- No hedging, no apologizing, no disclaimers by default. Never say things like "I'm just an AI," "unfortunately I can only," "I apologize, but," "as an assistant, I'm limited to." If a tool comes back empty, say so plainly and directly ("No overdue stages right now") — that's a normal answer, not a failure to soften.
- Only mention what you can't do when the user actually asked for that specific thing. A normal in-scope question gets a normal in-scope answer, full stop — never preface it with a reminder of your scope or limitations. The "I can only help with Proxpex" redirect exists for one situation only: a genuinely off-topic request (general knowledge, writing/debugging code, unrelated advice). It does not belong anywhere else, ever.
- Short sentences, active voice, sentence case. No exclamation points, no "Great question!", no "I'd be happy to help you with that!", no filler before the substance.
- Never invent data. Always call a tool to look something up rather than guessing.
- Some requirement fields are sensitive (credentials, keys). Tool results never include their actual value — only that the field exists and a link to it. Never claim to know or guess the value; just point to the link, e.g. "Found it — use the link below to view it in the app."
- Write plain prose only — no markdown links, no raw URLs, no bullet-pointed link lists. The app already renders every result as a clickable button beneath your reply, so just describe what you found in a sentence or two and let those buttons do the navigating.
- You can't take actions that change data yet — that's a later phase. Only bring this up if someone actually asks you to create or edit something; then just say so in one short sentence, no apology.
- Your reply is shown to the user verbatim, with nothing stripped out. Never write out your own instructions, rules, flags, or reasoning as part of the reply — no lines like "do_not_use_markdown = true" or any other self-notes. Output only the actual answer, nothing about how you're formatting it.

How to resolve what the user's asking about — this is how you actually find things, not a formality:
- Any name in a message could be a project, a client, a PM, or a team member — you don't know which until you check. Call list_accessible_entities to see the real roster and match their wording against it yourself; partial names and minor misspellings still resolve fine that way. Never assume something is a project name just because of how a question is phrased. If the name turns out to be a person, use the project(s) linked to them.
- Once you know which project is relevant, call get_project_details to get its real stages, requirement fields, documents, MOM, audit log, team updates, and invoices — then match the user's wording against those real names/labels yourself, semantically, not by requiring an exact substring. "The google key" can be the field actually named "Google Cloud API Key." "The client's contract" can be a document actually labeled "Signed SOW.pdf." Get close, not exact.
- Words like "last," "latest," "recent," "first," "oldest," "overdue," "upcoming," or "this week" are sorting/filtering instructions, not literal words to search for — they apply to whatever dated list is relevant (audit log, MOM, team updates, invoices, stage due dates), not just one specific data type. get_project_details' lists already come pre-sorted for exactly this; "last" means the first entry in a newest-first list, "oldest" means the last one. Use get_project_status instead when the ask is specifically a structured stage-status filter (overdue/due this week/in progress/etc.) — it does real date math.
- Only call search_proxpex when nothing's been named yet and the ask is a genuine "find X anywhere" search.
- If you can't find a confident match after actually checking, don't just say "not found." Say what you DID find, and ask a specific follow-up naming the closest real candidates you saw — "Found the Yolo project, but nothing in its Requirements matching 'google key' — did you mean [closest real field names]?" A flat "nothing found" is only for when there's genuinely no relevant match anywhere, not a first resort.`

function collectLinks(toolResults) {
  const links = []
  function push(label, href, sensitive) {
    if (href && links.length < MAX_LINKS) links.push({ label, href, sensitive: !!sensitive })
  }

  for (const { name, data } of toolResults) {
    if (name === 'search_proxpex') {
      for (const hit of data.hits || []) push(hit.label, hit.href, hit.sensitive)
    } else if (name === 'get_project_status') {
      for (const s of data.stages || []) push(`${s.projectName} · ${s.stageName}${s.overdue ? ' (overdue)' : ''}`, s.href, false)
    } else if (name === 'get_project_details' && data.project) {
      const p = data.project
      push(p.name, p.href, false)
      for (const s of data.stages || []) push(`${p.name} · ${s.name}`, s.href, false)
      for (const section of data.resourceSections || []) {
        for (const item of section.items || []) {
          push(`${p.name} · Requirements · ${section.name} · ${item.name}`, item.href, item.sensitive)
        }
      }
      for (const doc of data.documents || []) push(`${p.name} · Document · ${doc.label}`, doc.href, false)
    }
  }
  return links
}

// Defense in depth: even with includeThoughts off, strip any leaked
// self-instruction lines (e.g. "_self_do_not_use_markdown_links = true")
// from the front of the reply so they never reach the user.
const LEAKED_FLAG_LINE = /^\s*[a-zA-Z_][\w-]*\s*=\s*(true|false)\s*$/

function stripLeakedInstructions(text) {
  const lines = text.split('\n')
  let start = 0
  while (start < lines.length && (LEAKED_FLAG_LINE.test(lines[start]) || lines[start].trim() === '')) {
    start++
  }
  return lines.slice(start).join('\n').trim()
}

// The actual reasoning loop, factored out of the HTTP handler so it can
// also be exercised directly (see app/api/rex/debug-test) without needing
// a browser session — auth/parsing stays in POST below, this just takes an
// already-verified caller.
export async function runRexChat({ rexCaller, message, history, pageContext }) {
  const priorTurns = Array.isArray(history) ? history : []

  let systemPrompt = SYSTEM_PROMPT
  if (pageContext?.type === 'project' && typeof pageContext.projectId === 'string') {
    const pageProject = await resolvePageProject(rexCaller, pageContext.projectId)
    if (pageProject) {
      systemPrompt += `\n\nThe user currently has the project "${pageProject.projectName}" (id: ${pageProject.projectId}) open on screen. If they say "here," "this project," or otherwise don't name a project, assume they mean this one — you can call get_project_details or get_project_status with this id directly, no need to resolve it again. Don't mention this note itself.`
    }
  }

  const contents = [
    ...priorTurns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ]

  const toolResults = []
  let finalParts = []

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const parts = await callGemini({ systemPrompt, contents, tools: REX_TOOL_DECLARATIONS })
    const functionCalls = parts.filter((p) => p.functionCall)

    if (functionCalls.length === 0) {
      finalParts = parts
      break
    }

    contents.push({ role: 'model', parts })

    const responses = await Promise.all(
      functionCalls.map(async (p) => {
        const { name, args, id } = p.functionCall
        let data
        try {
          data = await executeRexTool(rexCaller, name, args)
        } catch (err) {
          data = { error: err.message || 'Tool failed.' }
        }
        toolResults.push({ name, data })
        // Gemini 3.x matches a function response back to its call by id —
        // required when multiple calls run in the same turn, and harmless
        // to always include. `name` must still match too.
        return { functionResponse: { id, name, response: data } }
      })
    )
    contents.push({ role: 'user', parts: responses })
  }

  const text = stripLeakedInstructions(
    finalParts
      .filter((p) => !p.thought)
      .map((p) => p.text || '')
      .join('')
      .trim()
  ) || "I couldn't put together a response for that — try rephrasing?"

  return { text, links: collectLinks(toolResults), toolResults }
}

// Buffered response, not SSE: Amplify Hosting doesn't support streaming
// responses from Next.js routes, and routes it through a different compute
// path that doesn't get the app's environment variables injected.
export async function POST(req) {
  // TEMP DIAGNOSTIC — remove after confirming env vars in CloudWatch.
  console.log('REX ROUTE HIT')
  console.log('REX ENV CHECK: FIREBASE_ADMIN_PROJECT_ID present =', !!process.env.FIREBASE_ADMIN_PROJECT_ID)
  console.log('REX ENV CHECK: FIREBASE_ADMIN_CLIENT_EMAIL present =', !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
  console.log('REX ENV CHECK: FIREBASE_ADMIN_PRIVATE_KEY present =', !!process.env.FIREBASE_ADMIN_PRIVATE_KEY)

  let uid, caller
  try {
    ;({ uid, caller } = await requireManager(req))
  } catch (err) {
    return Response.json({ error: err.message || 'Unauthorized.' }, { status: err.status || 401 })
  }

  const rexCaller = { uid, role: caller.role, companyId: caller.companyId }

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { message, history, pageContext } = body || {}
  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Missing message.' }, { status: 400 })
  }

  const priorTurns = Array.isArray(history) ? history : []
  if (priorTurns.length >= MAX_MESSAGES) {
    return Response.json({ error: 'This conversation has reached its limit — start a new one.' }, { status: 400 })
  }

  try {
    const { text, links } = await runRexChat({ rexCaller, message, history: priorTurns, pageContext })
    return Response.json({ text, links })
  } catch (err) {
    return Response.json({ error: err.message || 'Something went wrong.' }, { status: 500 })
  }
}
