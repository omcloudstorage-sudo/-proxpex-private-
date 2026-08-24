'use client'

import { useEffect, useState } from 'react'
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Assignee pool for a project = its PM + every team_member with
// pmId == project.pmId. This mirrors the exact rule that already governs
// project access (firestore.rules, projects/update), so there's no new
// "who's on this project" concept to maintain — a team member who can see
// the project is exactly a team member who can be assigned on it.
//
// `companyId` is required alongside `pmId`: firestore.rules only lets a
// caller list `users` docs by companyId (or, separately, by their own uid as
// pmId) — a bare `where('pmId', '==', pmId)` query can't be validated by the
// rules engine for anyone other than that PM themselves, so it silently
// permission-denies for every other role viewing the same project. Filtering
// on companyId too makes the query provable for any caller in that company.
export function useProjectTeam(pmId, companyId) {
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
    if (!pmId || !companyId) {
      setTeamMembers([])
      return
    }
    const unsub = onSnapshot(
      query(collection(db, 'users'), where('companyId', '==', companyId), where('pmId', '==', pmId)),
      (snap) => setTeamMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [pmId, companyId])

  const assignees = pmId
    ? [{ id: pmId, name: pm?.name || 'PM', role: 'pm' }, ...teamMembers.map((m) => ({ id: m.id, name: m.name, role: 'team_member' }))]
    : []

  return { assignees }
}
