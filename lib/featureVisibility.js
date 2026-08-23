// Company-wide feature-visibility toggles, same pattern as
// lib/priorityLibrary.js: a small seeded list an Admin can flip per role.
// pm/client booleans gate whether that role sees the feature; Admin always
// sees everything regardless of these flags.
export const DEFAULT_FEATURES = [
  { id: 'sprintPlanner', name: 'Sprint Planner', pm: true, client: true },
]

export function resolveFeature(featureId, library) {
  const entry = (library || []).find((f) => f.id === featureId)
  if (entry) return entry
  return DEFAULT_FEATURES.find((f) => f.id === featureId) || { id: featureId, name: featureId, pm: true, client: true }
}

// Admin always passes; pm/client are gated by their flag.
export function isFeatureVisible(featureId, library, role) {
  if (role === 'admin') return true
  const entry = resolveFeature(featureId, library)
  if (role === 'pm' || role === 'team_member') return entry.pm !== false
  if (role === 'client') return entry.client !== false
  return true
}
