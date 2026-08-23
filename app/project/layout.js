'use client'

import { useAuth } from '@/contexts/AuthContext'
import RexWidget from '@/components/RexWidget'

// A layout, not something mounted inside page.js: Next.js remounts a
// page.js component when only its dynamic segment changes (confirmed —
// switching between two different project ids re-created RexWidget's DOM
// node entirely, which silently ate the dance-on-navigation trigger since
// a freshly-mounted instance has no "previous" pathname to compare
// against). A layout persists across that kind of navigation the same
// way DashboardShell persists across the sidebar screens, so RexWidget
// mounts once here and actually sees the pathname change.
export default function ProjectLayout({ children }) {
  const { profile } = useAuth()
  return (
    <>
      {children}
      {/* Rex is scoped to Admins/PMs server-side (requireManager) — only
          mount him for those roles, so a client/team member never sees an
          icon that just errors on click. */}
      {(profile?.role === 'admin' || profile?.role === 'pm') && <RexWidget />}
    </>
  )
}
