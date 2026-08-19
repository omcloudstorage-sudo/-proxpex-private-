'use client'

import RequireRole from '@/components/RequireRole'
import CompanyStatusGate from '@/components/CompanyStatusGate'
import { PmDataProvider } from '@/contexts/PmDataContext'
import PmShell from '@/components/PmShell'

export default function PmLayout({ children }) {
  return (
    <RequireRole role="pm">
      <CompanyStatusGate>
        <PmDataProvider>
          <PmShell>{children}</PmShell>
        </PmDataProvider>
      </CompanyStatusGate>
    </RequireRole>
  )
}
