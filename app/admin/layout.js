'use client'

import RequireRole from '@/components/RequireRole'
import CompanyStatusGate from '@/components/CompanyStatusGate'
import { AdminDataProvider } from '@/contexts/AdminDataContext'
import AdminShell from '@/components/AdminShell'

export default function AdminLayout({ children }) {
  return (
    <RequireRole role="admin">
      <CompanyStatusGate>
        <AdminDataProvider>
          <AdminShell>{children}</AdminShell>
        </AdminDataProvider>
      </CompanyStatusGate>
    </RequireRole>
  )
}
