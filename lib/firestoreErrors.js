// Turns a Firestore write failure into a message worth showing in a
// settings form — kept generic and non-technical since this is user-facing;
// no mention of Firestore rules/deploys, that's an internal detail for
// whoever maintains the app, not something an Admin/PM reading the UI needs.
export function saveErrorMessage(err) {
  if (err?.code === 'permission-denied') {
    return "You don't have permission to save this. Please try again, or contact support if it keeps happening."
  }
  return "Something went wrong saving this. Please try again."
}
