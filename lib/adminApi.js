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
