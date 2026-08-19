'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

const AdminDataContext = createContext(null)

export function AdminDataProvider({ children }) {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    if (!profile) return
    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('companyId', '==', profile.companyId)),
      (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), where('companyId', '==', profile.companyId)),
      (snap) => setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    const unsubCompany = onSnapshot(doc(db, 'companies', profile.companyId), (snap) => {
      if (snap.exists()) setCompanyName(snap.data().name)
    })
    return () => {
      unsubUsers()
      unsubProjects()
      unsubCompany()
    }
  }, [profile])

  const pms = users.filter((u) => u.role === 'pm')
  const clients = users.filter((u) => u.role === 'client')
  const teamMembers = users.filter((u) => u.role === 'team_member')

  return (
    <AdminDataContext.Provider value={{ users, projects, companyName, pms, clients, teamMembers }}>
      {children}
    </AdminDataContext.Provider>
  )
}

export function useAdminData() {
  return useContext(AdminDataContext)
}
