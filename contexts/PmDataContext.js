'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

const PmDataContext = createContext(null)

export function PmDataProvider({ children }) {
  const { user, profile } = useAuth()
  const [projects, setProjects] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [clients, setClients] = useState([])

  useEffect(() => {
    if (!user) return
    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), where('pmId', '==', user.uid)),
      (snap) => setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    const unsubTeam = onSnapshot(
      query(collection(db, 'users'), where('pmId', '==', user.uid)),
      (snap) => setTeamMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    return () => {
      unsubProjects()
      unsubTeam()
    }
  }, [user])

  useEffect(() => {
    if (!profile?.companyId) return
    const unsubClients = onSnapshot(
      query(collection(db, 'users'), where('companyId', '==', profile.companyId), where('role', '==', 'client')),
      (snap) => setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    return unsubClients
  }, [profile?.companyId])

  return <PmDataContext.Provider value={{ projects, teamMembers, clients }}>{children}</PmDataContext.Provider>
}

export function usePmData() {
  return useContext(PmDataContext)
}
