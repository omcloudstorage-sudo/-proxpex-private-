const MODEL = 'gemini-3.5-flash-lite'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Thin wrapper around Gemini's generateContent REST endpoint — no SDK
// dependency needed for a single request/response call. Function-calling
// tool declarations are passed straight through in Gemini's format.
//
// No temperature/top_p/top_k override (ignored on 3.x anyway) and no
// thinking_budget/thinking_level override — 3.x's default thinking level
// is fine for this assistant's latency/quality tradeoff. Add thinking_level
// explicitly here if that ever needs tuning. includeThoughts stays off
// below regardless, since thought summaries aren't meant for the end user.
export async function callGemini({ systemPrompt, contents, tools }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.')

  const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      tools: tools?.length ? [{ functionDeclarations: tools }] : undefined,
      // Thought summaries aren't meant for the end user — without this,
      // reasoning/self-notes can show up as regular text parts and leak
      // into the visible reply.
      generationConfig: { thinkingConfig: { includeThoughts: false } },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]
  if (!candidate) {
    const blockReason = data.promptFeedback?.blockReason
    throw new Error(blockReason ? `Gemini blocked the request: ${blockReason}` : 'Gemini returned no response.')
  }

  return candidate.content?.parts || []
}
