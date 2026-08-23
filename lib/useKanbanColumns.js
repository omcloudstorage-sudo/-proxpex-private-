'use client'

import { useEffect, useRef, useState } from 'react'
import { collection, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { DEFAULT_COLUMNS, sortedColumns } from '@/lib/kanbanColumns'

// Company-wide Sprint Board columns — same subscribe-and-seed shape as
// lib/useStatusLibrary.js. Seeds the default To Do / In Progress / Review /
// Done set once, the first time a company has no library yet, so existing
// boards keep working with zero migration.
export function useKanbanColumns(companyId, canManage) {
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const seeded = useRef(false)

  useEffect(() => {
    if (!companyId) return
    const colRef = collection(db, 'companies', companyId, 'kanbanColumnLibrary')

    if (canManage && !seeded.current) {
      seeded.current = true
      getDocs(colRef).then((snap) => {
        if (snap.empty) {
          DEFAULT_COLUMNS.forEach((entry) => {
            setDoc(doc(db, 'companies', companyId, 'kanbanColumnLibrary', entry.id), entry).catch(() => {})
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

  return { columns: sortedColumns(library), loading }
}
