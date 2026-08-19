'use client'

import { useAdminData } from '@/contexts/AdminDataContext'
import PeopleTab from '@/app/admin/_components/PeopleTab'

export default function AdminPmsPage() {
  const { pms } = useAdminData()

  return (
    <PeopleTab
      people={pms}
      role="pm"
      title="Project manager"
      pageTitle="Project managers"
      subtitle="Everyone with PM access to your company's projects."
    />
  )
}
