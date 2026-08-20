import { DEFAULT_STAGE_NAMES } from '@/lib/stages'
import { defaultSections } from '@/lib/resources'

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Roadmap templates and Requirement Sheet (resources/credentials) templates
// are independent — a project picks each separately on creation, so they
// live in their own subcollections (see lib/useTemplates.js) instead of one
// bundled "template" doc.
export function newRoadmapTemplate() {
  return {
    id: genId('rmtmpl'),
    name: '',
    stages: DEFAULT_STAGE_NAMES.map((name, i) => ({ name, order: i })),
    statusIds: [],
  }
}

export function newResourceTemplate() {
  return {
    id: genId('restmpl'),
    name: '',
    resourceSections: defaultSections(),
  }
}

export function newTemplateStage(order) {
  return { name: 'New stage', order }
}
