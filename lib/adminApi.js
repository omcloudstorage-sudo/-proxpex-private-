import { auth } from '@/lib/firebase'

export async function callAdminApi(path, body) {
  const idToken = await auth.currentUser.getIdToken()
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed.')
  return data
}

// Same auth pattern as callAdminApi, but for multipart form bodies (file
// uploads) — no Content-Type header, so the browser sets the boundary.
export async function callAdminApiForm(path, formData) {
  const idToken = await auth.currentUser.getIdToken()
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed.')
  return data
}
