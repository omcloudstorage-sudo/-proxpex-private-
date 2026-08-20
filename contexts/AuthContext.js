'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

const AuthContext = createContext({
  user: null,
  profile: null,
  company: null,
  companyLoading: false,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [companyLoading, setCompanyLoading] = useState(false)

  useEffect(() => {
    let unsubProfile = () => {}

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      unsubProfile()
      setUser(fbUser)

      if (!fbUser) {
        setProfile(null)
        setLoading(false)
        return
      }

      unsubProfile = onSnapshot(doc(db, 'users', fbUser.uid), (snap) => {
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        setLoading(false)
      })
    })

    return () => {
      unsubAuth()
      unsubProfile()
    }
  }, [])

  // Companies with a role tied to a companyId (admin/pm/client/team_member)
  // get their company doc streamed here so CompanyStatusGate can block
  // access while the company is pending/rejected approval.
  useEffect(() => {
    let unsubCompany = () => {}

    if (!profile?.companyId) {
      setCompany(null)
      setCompanyLoading(false)
      return
    }

    setCompanyLoading(true)
    unsubCompany = onSnapshot(doc(db, 'companies', profile.companyId), (snap) => {
      setCompany(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      setCompanyLoading(false)
    })

    return () => unsubCompany()
  }, [profile?.companyId])

  const signOut = async () => {
    await fbSignOut(auth)
  }

  // Firebase's `emailVerified` is only as fresh as the last-fetched user
  // record, so callers polling for live verification status (e.g. the
  // "verify your email" gate) need this to pull the latest value.
  const refreshUser = async () => {
    if (!auth.currentUser) return
    await auth.currentUser.reload()
    setUser(Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser))
  }

  return (
    <AuthContext.Provider value={{ user, profile, company, companyLoading, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
