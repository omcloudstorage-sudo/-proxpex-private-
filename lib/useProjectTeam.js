'use client'

import { useEffect, useState } from 'react'
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Assignee pool for a project = its PM + every team_member with
// pmId == project.pmId. This mirrors the exact rule that already governs
// project access (firestore.rules, projects/update), so there's no new
// "who's on this project" concept to maintain — a team member who can see
// the project is exactly a team member who can be assigned on it.
export function useProjectTeam(pmId) {
  const [pm, setPm] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])

  useEffect(() => {
    if (!pmId) {
      setPm(null)
      return
    }
    const unsub = onSnapshot(doc(db, 'users', pmId), (snap) => {
      setPm(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    })
    return unsub
  }, [pmId])

  useEffect(() => {
    if (!pmId) {
      setTeamMembers([])
      return
    }
    const unsub = onSnapshot(
      query(collection(db, 'users'), where('pmId', '==', pmId)),
      (snap) => setTeamMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [pmId])

  const assignees = pmId
    ? [{ id: pmId, name: pm?.name || 'PM', role: 'pm' }, ...teamMembers.map((m) => ({ id: m.id, name: m.name, role: 'team_member' }))]
    : []

  return { assignees }
}
