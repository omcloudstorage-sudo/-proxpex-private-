'use client'

import { useEffect, useRef, useState } from 'react'
import { collection, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { DEFAULT_PRIORITIES } from '@/lib/priorityLibrary'

// Mirrors lib/useStatusLibrary.js: lazily seeds the four default priority
// levels the first time a company has none, and never throws on a denied
// read — it just falls back to an empty library (resolvePriority handles
// that gracefully).
export function usePriorityLibrary(companyId, canManage) {
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const seeded = useRef(false)

  useEffect(() => {
    if (!companyId) return
    const colRef = collection(db, 'companies', companyId, 'priorityLibrary')

    if (canManage && !seeded.current) {
      seeded.current = true
      getDocs(colRef).then((snap) => {
        if (snap.empty) {
          DEFAULT_PRIORITIES.forEach((entry) => {
            setDoc(doc(db, 'companies', companyId, 'priorityLibrary', entry.id), entry).catch(() => {})
          })
        }
      }).catch(() => {})
    }

    const unsub = onSnapshot(
      colRef,
      (snap) => {
        setLibrary(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      () => {
        setLibrary([])
        setLoading(false)
      }
    )
    return unsub
  }, [companyId, canManage])

  return { library, loading }
}
