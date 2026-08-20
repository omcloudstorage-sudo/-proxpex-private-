'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

function useTemplateCollection(companyId, collectionName) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    const unsub = onSnapshot(
      collection(db, 'companies', companyId, collectionName),
      (snap) => {
        setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      () => {
        setTemplates([])
        setLoading(false)
      }
    )
    return unsub
  }, [companyId, collectionName])

  return { templates, loading }
}

export function useRoadmapTemplates(companyId) {
  const { templates, loading } = useTemplateCollection(companyId, 'roadmapTemplates')
  return { templates, loading }
}

export function useResourceTemplates(companyId) {
  const { templates, loading } = useTemplateCollection(companyId, 'resourceTemplates')
  return { templates, loading }
}
