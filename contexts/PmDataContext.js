'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

const PmDataContext = createContext(null)

export function PmDataProvider({ children }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [teamMembers, setTeamMembers] = useState([])

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

  return <PmDataContext.Provider value={{ projects, teamMembers }}>{children}</PmDataContext.Provider>
}

export function usePmData() {
  return useContext(PmDataContext)
}
