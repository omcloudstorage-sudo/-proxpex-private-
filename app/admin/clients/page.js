'use client'

import { useAdminData } from '@/contexts/AdminDataContext'
import PeopleTab from '@/app/admin/_components/PeopleTab'

export default function AdminClientsPage() {
  const { clients } = useAdminData()

  return (
    <PeopleTab
      people={clients}
      role="client"
      title="Client"
      pageTitle="Clients"
      subtitle="Everyone with read-only access to their project's roadmap."
    />
  )
}
