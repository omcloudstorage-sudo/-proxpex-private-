import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Submitted anonymously from the public /access page. firestore.rules
// enforces the required fields and reviewed:false on create; only the
// Platform Owner can read or update afterward (see app/owner/page.js).
export async function submitBetaRequest({ name, email, company, description }) {
  await addDoc(collection(db, 'betaRequests'), {
    name: name.trim(),
    email: email.trim(),
    company: company.trim(),
    description: description.trim(),
    reviewed: false,
    createdAt: serverTimestamp(),
  })
}
