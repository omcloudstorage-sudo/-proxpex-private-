'use client'

import { useMemo } from 'react'
import ResourcesTable from '@/components/ResourcesTable'
import { normalizeSections } from '@/lib/resources'

// Content-only — the sidebar trigger + Modal shell that opens this live on
// the project page (see ProjectSideBar/Modal in app/project/[id]/page.js).
export default function ResourcesPanel({ resources, onChange, canManage, logAction, focusItemId = null }) {
  const sections = useMemo(() => normalizeSections(resources), [resources])
  const totalItems = sections.reduce((n, s) => n + s.items.length, 0)

  return (
    <div>
      {totalItems === 0 && (
        <p className="text-sm text-slate-light italic mb-3">
          No resources yet{canManage ? ' — add credentials or links your team needs.' : '.'}
        </p>
      )}
      <ResourcesTable sections={sections} onChange={onChange} canManage={canManage} logAction={logAction} focusItemId={focusItemId} />
    </div>
  )
}
