'use client'

import { usePmData } from '@/contexts/PmDataContext'
import PeopleTab from '@/app/admin/_components/PeopleTab'

export default function PmClientsPage() {
  const { clients } = usePmData()

  return (
    <div className="page-fade">
      <PeopleTab
        people={clients}
        role="client"
        title="Client"
        pageTitle="Clients"
        subtitle="Everyone with read-only access to their project's roadmap."
      />
    </div>
  )
}
