'use client'

import { useEffect, useRef, useState } from 'react'
import { collection, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { DEFAULT_FEATURES } from '@/lib/featureVisibility'

// Mirrors lib/usePriorityLibrary.js: lazily seeds the default feature list
// the first time a company has none, and never throws on a denied read —
// falls back to an empty library (resolveFeature/isFeatureVisible default
// everything to visible when unseeded).
export function useFeatureVisibility(companyId, canManage) {
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const seeded = useRef(false)

  useEffect(() => {
    if (!companyId) return
    const colRef = collection(db, 'companies', companyId, 'featureVisibility')

    if (canManage && !seeded.current) {
      seeded.current = true
      getDocs(colRef).then((snap) => {
        if (snap.empty) {
          DEFAULT_FEATURES.forEach((entry) => {
            setDoc(doc(db, 'companies', companyId, 'featureVisibility', entry.id), entry).catch(() => {})
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
