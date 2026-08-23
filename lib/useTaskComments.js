'use client'

import { useEffect, useState } from 'react'
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Comments subcollection under a single task (or subtask — subtasks are
// tasks, so this hook works identically for either). Append-only: this
// module never exposes update/delete, matching firestore.rules.
export function useTaskComments(projectId, taskId) {
  const [comments, setComments] = useState([])

  useEffect(() => {
    if (!projectId || !taskId) {
      setComments([])
      return
    }
    const unsub = onSnapshot(
      query(collection(db, 'projects', projectId, 'tasks', taskId, 'comments'), orderBy('createdAt', 'asc')),
      (snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [projectId, taskId])

  async function postComment(taskIdArg, text, author) {
    await addDoc(collection(db, 'projects', projectId, 'tasks', taskIdArg, 'comments'), {
      text,
      authorId: author.uid,
      authorName: author.name,
      authorRole: author.role,
      createdAt: serverTimestamp(),
    })
  }

  return { comments, postComment }
}
