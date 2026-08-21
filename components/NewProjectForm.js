'use client'

import { useMemo, useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { LabeledInput, LabeledSelect } from '@/components/FormFields'
import { countryOptions } from '@/lib/countries'
import { makeStages, makeDefaultStages } from '@/lib/stages'
import { instantiateSections, defaultSections } from '@/lib/resources'
import { resolveStatusKind, activeStatuses, STATUS_KINDS, DEFAULT_STATUSES } from '@/lib/statusLibrary'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { useRoadmapTemplates, useResourceTemplates } from '@/lib/useTemplates'
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog'

// Shared by Admin's and PM's "New project" forms. Pass fixedPmId to lock
// the PM to the current user (PM flow); omit it (and pass pms) for Admin's
// PM-picker flow.
// Roadmap and Requirement Sheet templates are picked independently — a
// project can mix any roadmap template with any requirement sheet
// template, or leave either blank for the default/blank starting point.
export default function NewProjectForm({ profile, pms, clients, fixedPmId, pmMap = {}, clientMap = {}, onDone }) {
  const { library } = useStatusLibrary(profile.companyId, true)
  const { templates: roadmapTemplates } = useRoadmapTemplates(profile.companyId)
  const { templates: resourceTemplates } = useResourceTemplates(profile.companyId)

  const [name, setName] = useState('')
  const [pmId, setPmId] = useState('')
  const [clientId, setClientId] = useState('')
  const [country, setCountry] = useState('')
  const [roadmapTemplateId, setRoadmapTemplateId] = useState('')
  const [resourceTemplateId, setResourceTemplateId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const roadmapOptions = useMemo(() => roadmapTemplates.map((t) => ({ id: t.id, name: t.name })), [roadmapTemplates])
  const resourceOptions = useMemo(() => resourceTemplates.map((t) => ({ id: t.id, name: t.name })), [resourceTemplates])

  async function createProject(e) {
    e.preventDefault()
    setError('')
    const finalPmId = fixedPmId || pmId
    if (!name || !finalPmId || !clientId) {
      setError('Please fill in project name, PM, and client.')
      return
    }
    setBusy(true)
    try {
      const roadmapTemplate = roadmapTemplates.find((t) => t.id === roadmapTemplateId)
      const resourceTemplate = resourceTemplates.find((t) => t.id === resourceTemplateId)

      let statusSetIds = roadmapTemplate?.statusIds?.length ? roadmapTemplate.statusIds : activeStatuses(library).map((s) => s.id)
      if (!statusSetIds.length) statusSetIds = DEFAULT_STATUSES.map((s) => s.id)

      const firstId = statusSetIds.find((id) => resolveStatusKind(id, library) === STATUS_KINDS.IN_PROGRESS) || statusSetIds[0]
      const restId = statusSetIds.find((id) => resolveStatusKind(id, library) === STATUS_KINDS.PENDING) || statusSetIds[0]

      const stages = roadmapTemplate?.stages?.length
        ? makeStages(roadmapTemplate.stages, { first: firstId, rest: restId })
        : makeDefaultStages({ first: firstId, rest: restId })

      const resources = resourceTemplate?.resourceSections?.length ? instantiateSections(resourceTemplate.resourceSections) : defaultSections()

      const templateNote = [roadmapTemplate && `roadmap "${roadmapTemplate.name}"`, resourceTemplate && `requirement sheet "${resourceTemplate.name}"`]
        .filter(Boolean)
        .join(', ')

      const ref = await addDoc(collection(db, 'projects'), {
        companyId: profile.companyId,
        name,
        pmId: finalPmId,
        clientId,
        country,
        stages,
        statusSetIds,
        resources,
        documents: [],
        createdAt: serverTimestamp(),
      })
      await logAction(
        ref.id,
        { uid: profile.id, name: profile.name, role: profile.role },
        AUDIT_ACTIONS.PROJECT_CREATED,
        `Project created${templateNote ? ` from template — ${templateNote}` : ''} — PM: ${pmMap[finalPmId] || profile.name || '—'}, Client: ${clientMap[clientId] || '—'} assigned`
      )
      setName('')
      setPmId('')
      setClientId('')
      setCountry('')
      setRoadmapTemplateId('')
      setResourceTemplateId('')
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={createProject} className="bg-surface border border-line rounded-card shadow-card p-6 mb-6 grid md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
      <LabeledInput label="Project name" value={name} onChange={setName} />
      {!fixedPmId && <LabeledSelect label="Project manager" value={pmId} onChange={setPmId} options={pms} empty="No PMs yet" />}
      <LabeledSelect label="Client" value={clientId} onChange={setClientId} options={clients} empty="No clients yet" />
      <LabeledSelect label="Country" value={country} onChange={setCountry} options={countryOptions} empty="No countries" />
      <LabeledSelect label="Roadmap template" value={roadmapTemplateId} onChange={setRoadmapTemplateId} options={roadmapOptions} empty="No templates — default roadmap" />
      <LabeledSelect label="Requirement sheet template" value={resourceTemplateId} onChange={setResourceTemplateId} options={resourceOptions} empty="No templates — blank sheet" />
      <button
        type="submit"
        disabled={busy}
        className="text-sm font-medium px-4 py-2.5 rounded-lg bg-signal text-white hover:bg-signal-dark disabled:opacity-50"
      >
        {busy ? 'Creating…' : 'Create project'}
      </button>
      {error && <p className="text-coral text-xs md:col-span-3 lg:col-span-6">{error}</p>}
    </form>
  )
}
