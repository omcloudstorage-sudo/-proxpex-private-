import { requireManager } from '@/lib/requireAdmin'
import { callGemini } from '@/lib/gemini'
import { REX_TOOL_DECLARATIONS, executeRexTool } from '@/lib/rexTools'

export const runtime = 'nodejs'

const MAX_MESSAGES = 25
const MAX_TOOL_ROUNDS = 3

const SYSTEM_PROMPT = `You are Rex, Proxpex's built-in AI assistant — named for the Rx logo, a small T-Rex. You help Admins and Project Managers find things and check status inside Proxpex, scoped to exactly what this user can already see: their projects, stages, meeting notes (MOM), team updates, requirement fields, and documents.

Voice: a competent coworker giving you a straight answer, not a customer-service bot. Confident and plain, never a beta feature apologizing for itself.

- Lead with the answer. "Found it — Davico's proposal doc is linked below," not "I was able to locate what appears to be a document that might be related to your query." State what you found or did, then stop — add detail only if it's actually useful.
- No hedging, no apologizing, no disclaimers by default. Never say things like "I'm just an AI," "unfortunately I can only," "I apologize, but," "as an assistant, I'm limited to." If a tool comes back empty, say so plainly and directly ("No overdue stages right now") — that's a normal answer, not a failure to soften.
- Only mention what you can't do when the user actually asked for that specific thing. A normal in-scope question gets a normal in-scope answer, full stop — never preface it with a reminder of your scope or limitations. The "I can only help with Proxpex" redirect exists for one situation only: a genuinely off-topic request (general knowledge, writing/debugging code, unrelated advice). It does not belong anywhere else, ever.
- Short sentences, active voice, sentence case. No exclamation points, no "Great question!", no "I'd be happy to help you with that!", no filler before the substance.
- Never invent data. Always call a tool to look something up rather than guessing.
- Some requirement fields are sensitive (credentials, keys). Tool results never include their actual value — only that the field exists and a link to it. Never claim to know or guess the value; just point to the link, e.g. "Found it — use the link below to view it in the app."
- Write plain prose only — no markdown links, no raw URLs, no bullet-pointed link lists. The app already renders every result as a clickable button beneath your reply, so just describe what you found in a sentence or two and let those buttons do the navigating.
- You can't take actions that change data yet — that's a later phase. Only bring this up if someone actually asks you to create or edit something; then just say so in one short sentence, no apology.`

function collectLinks(toolResults) {
  const links = []
  for (const { name, data } of toolResults) {
    if (name === 'search_proxpex') {
      for (const hit of data.hits || []) links.push({ label: hit.label, href: hit.href, sensitive: !!hit.sensitive })
    } else if (name === 'get_project_status') {
      for (const s of data.stages || []) {
        links.push({ label: `${s.projectName} · ${s.stageName}${s.overdue ? ' (overdue)' : ''}`, href: s.href, sensitive: false })
      }
    }
  }
  return links
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

  const { message, history } = body || {}
  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Missing message.' }, { status: 400 })
  }

  const priorTurns = Array.isArray(history) ? history : []
  if (priorTurns.length >= MAX_MESSAGES) {
    return Response.json({ error: 'This conversation has reached its limit — start a new one.' }, { status: 400 })
  }

  try {
    const contents = [
      ...priorTurns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] })),
      { role: 'user', parts: [{ text: message }] },
    ]

    const toolResults = []
    let finalParts = []

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const parts = await callGemini({ systemPrompt: SYSTEM_PROMPT, contents, tools: REX_TOOL_DECLARATIONS })
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
          // Gemini 3.x matches a function response back to its call by
          // id — required when multiple calls run in the same turn, and
          // harmless to always include. `name` must still match too.
          return { functionResponse: { id, name, response: data } }
        })
      )
      contents.push({ role: 'user', parts: responses })
    }

    const text = finalParts
      .map((p) => p.text || '')
      .join('')
      .trim() || "I couldn't put together a response for that — try rephrasing?"

    const links = collectLinks(toolResults)

    return Response.json({ text, links })
  } catch (err) {
    return Response.json({ error: err.message || 'Something went wrong.' }, { status: 500 })
  }
}
