'use client'

import { usePmData } from '@/contexts/PmDataContext'
import PeopleTab from '@/app/admin/_components/PeopleTab'

export default function PmTeamPage() {
  const { teamMembers } = usePmData()

  return (
    <PeopleTab
      people={teamMembers}
      role="team_member"
      title="Team member"
      pageTitle="Team members"
      subtitle="People you've added who can post project updates on your behalf."
    />
  )
}
