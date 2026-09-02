import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Singleton doc holding the shared beta access code checked by
// app/api/access/verify (Admin SDK) against what a visitor enters on
// /access. Only platform_owner can read/write it — see firestore.rules.
export async function setAccessCode(code) {
  await setDoc(doc(db, 'platformConfig', 'access'), { code: code.trim() }, { merge: true })
}
