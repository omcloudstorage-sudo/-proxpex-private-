'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { X } from 'lucide-react'
import { db } from '@/lib/firebase'
import { LabeledInput, LabeledSelect } from '@/components/FormFields'
import { countryOptions } from '@/lib/countries'
import { makeStages, makeDefaultStages } from '@/lib/stages'
import { instantiateSections, defaultSections } from '@/lib/resources'
import { resolveStatusKind, activeStatuses, STATUS_KINDS, DEFAULT_STATUSES } from '@/lib/statusLibrary'
import { useStatusLibrary } from '@/lib/useStatusLibrary'
import { useRoadmapTemplates, useResourceTemplates } from '@/lib/useTemplates'
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog'
import DocumentsPanel from '@/components/DocumentsPanel'

// The single "New project" entry point (sidebar button) renders this from
// both Admin's and PM's shells. Pass fixedPmId to lock the PM to the
// current user (PM flow); omit it (and pass pms) for Admin's PM-picker
// flow. Roadmap and Requirement Sheet templates are picked independently —
// a project can mix any roadmap template with any requirement sheet
// template, or leave either blank for the default/blank starting point.
export default function NewProjectForm({ open, onClose, profile, pms, clients, fixedPmId, pmMap = {}, clientMap = {} }) {
  const { library } = useStatusLibrary(profile?.companyId, true)
  const { templates: roadmapTemplates } = useRoadmapTemplates(profile?.companyId)
  const { templates: resourceTemplates } = useResourceTemplates(profile?.companyId)

  const [name, setName] = useState('')
  const [pmId, setPmId] = useState('')
  const [clientId, setClientId] = useState('')
  const [country, setCountry] = useState('')
  const [roadmapTemplateId, setRoadmapTemplateId] = useState('')
  const [resourceTemplateId, setResourceTemplateId] = useState('')
  const [documents, setDocuments] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const roadmapOptions = useMemo(() => roadmapTemplates.map((t) => ({ id: t.id, name: t.name })), [roadmapTemplates])
  const resourceOptions = useMemo(() => resourceTemplates.map((t) => ({ id: t.id, name: t.name })), [resourceTemplates])

  function resetForm() {
    setName('')
    setPmId('')
    setClientId('')
    setCountry('')
    setRoadmapTemplateId('')
    setResourceTemplateId('')
    setDocuments([])
    setError('')
  }

  function handleClose() {
    if (busy) return
    resetForm()
    onClose?.()
  }

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

      const templateNote = [
        roadmapTemplate && `roadmap "${roadmapTemplate.name}"`,
        resourceTemplate && `requirement sheet "${resourceTemplate.name}"`,
        documents.length > 0 && `${documents.length} document${documents.length === 1 ? '' : 's'} attached`,
      ]
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
        documents,
        createdAt: serverTimestamp(),
      })
      await logAction(
        ref.id,
        { uid: profile.id, name: profile.name, role: profile.role },
        AUDIT_ACTIONS.PROJECT_CREATED,
        `Project created${templateNote ? ` — ${templateNote}` : ''} — PM: ${pmMap[finalPmId] || profile.name || '—'}, Client: ${clientMap[clientId] || '—'} assigned`
      )
      resetForm()
      onClose?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        className="bg-surface rounded-card shadow-card border border-line max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line flex-shrink-0">
          <h2 className="font-display text-lg font-semibold text-ink">New project</h2>
          <button onClick={handleClose} className="text-slate-light hover:text-ink flex-shrink-0" title="Close">
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <form id="new-project-form" onSubmit={createProject} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid sm:grid-cols-2 gap-3">
            <LabeledInput label="Project name" value={name} onChange={setName} />
            {!fixedPmId && <LabeledSelect label="Project manager" value={pmId} onChange={setPmId} options={pms} empty="No PMs yet" />}
            <LabeledSelect label="Client" value={clientId} onChange={setClientId} options={clients} empty="No clients yet" />
            <LabeledSelect label="Country" value={country} onChange={setCountry} options={countryOptions} empty="No countries" />
            <LabeledSelect label="Roadmap template" value={roadmapTemplateId} onChange={setRoadmapTemplateId} options={roadmapOptions} empty="No templates — default roadmap" />
            <LabeledSelect label="Requirement sheet template" value={resourceTemplateId} onChange={setResourceTemplateId} options={resourceOptions} empty="No templates — blank sheet" />
          </div>

          <div className="border-t border-line pt-5">
            <DocumentsPanel documents={documents} editable onChange={setDocuments} />
          </div>

          {error && <p className="text-coral text-xs">{error}</p>}
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-line flex-shrink-0">
          <button type="button" onClick={handleClose} className="text-sm font-medium px-4 py-2.5 rounded-lg text-slate hover:text-ink">
            Cancel
          </button>
          <button
            type="submit"
            form="new-project-form"
            disabled={busy}
            className="text-sm font-medium px-5 py-2.5 rounded-lg bg-signal text-white hover:bg-signal-dark disabled:opacity-50 shadow-card"
          >
            {busy ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
