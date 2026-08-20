'use client'

import { useEffect, useRef, useState } from 'react'
import { collection, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { DEFAULT_STATUSES } from '@/lib/statusLibrary'

// Subscribes to a company's status library and, if it's the very first
// time this company has one (e.g. a company created before this feature
// existed), seeds the three default entries so old projects' raw
// 'pending'/'in_progress'/'done' stage statuses keep resolving. Seeding is
// idempotent (fixed doc IDs) and only attempted by admin/pm, who are the
// only roles firestore.rules lets write to this subcollection.
export function useStatusLibrary(companyId, canManage) {
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const seeded = useRef(false)

  useEffect(() => {
    if (!companyId) return
    const colRef = collection(db, 'companies', companyId, 'statusLibrary')

    if (canManage && !seeded.current) {
      seeded.current = true
      getDocs(colRef).then((snap) => {
        if (snap.empty) {
          DEFAULT_STATUSES.forEach((entry) => {
            setDoc(doc(db, 'companies', companyId, 'statusLibrary', entry.id), entry).catch(() => {})
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
        // Permission-denied (e.g. rules not deployed yet) or offline — fall
        // back to an empty library. resolveStatusKind/getStatusDisplay in
        // lib/statusLibrary.js handle an empty/missing library gracefully.
        setLibrary([])
        setLoading(false)
      }
    )
    return unsub
  }, [companyId, canManage])

  return { library, loading }
}
