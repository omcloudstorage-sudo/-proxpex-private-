'use client'

import { useMemo } from 'react'
import { useAdminData } from '@/contexts/AdminDataContext'
import PeopleTab from '@/app/admin/_components/PeopleTab'

export default function AdminTeamPage() {
  const { teamMembers, pms } = useAdminData()
  const pmNameById = useMemo(() => Object.fromEntries(pms.map((p) => [p.id, p.name])), [pms])

  return (
    <PeopleTab
      people={teamMembers}
      role="team_member"
      title="Team member"
      pageTitle="Team members"
      subtitle="Everyone added to a PM's team, across your whole company."
      pmOptions={pms}
      pmNameById={pmNameById}
    />
  )
}
