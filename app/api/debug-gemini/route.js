// TEMPORARY DIAGNOSTIC ROUTE — remove once the Amplify env var issue is
// resolved. Unauthenticated on purpose (quick browser checks while
// debugging); do not leave this in place once we're done.
export const runtime = 'nodejs'

const MODEL = 'gemini-3.5-flash-lite'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || ''
  const present = apiKey.length > 0

  if (!present) {
    return Response.json({ envVarFound: false, keyLength: 0, geminiCallOk: null, geminiError: null })
  }

  let geminiCallOk = false
  let geminiError = null

  try {
    const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Say hello.' }] }],
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      geminiError = `Gemini request failed (${res.status}): ${body.slice(0, 300)}`
    } else {
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
      geminiCallOk = !!text
      if (!geminiCallOk) geminiError = 'Gemini returned no text in response.'
    }
  } catch (err) {
    geminiError = err.message || 'Request to Gemini failed.'
  }

  return Response.json({
    envVarFound: true,
    keyLength: apiKey.length,
    geminiCallOk,
    geminiError,
  })
}
