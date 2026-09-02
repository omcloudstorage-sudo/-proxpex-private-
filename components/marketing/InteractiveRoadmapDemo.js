'use client'

import { useState } from 'react'
import RoadmapTimeline from '@/components/RoadmapTimeline'

// Fictional placeholder project — never real project/client data. Shape
// matches lib/stages.js exactly so the real RoadmapTimeline component can
// render it with zero adapter code.
const DEMO_PROJECT_NAME = 'Aurora Retail — Storefront Relaunch'
const DEMO_STAGES = [
  { id: 'demo-1', name: 'Kickoff', order: 0, status: 'done' },
  { id: 'demo-2', name: 'Requirement Gathering', order: 1, status: 'done' },
  { id: 'demo-3', name: 'UI/UX Design', order: 2, status: 'in_progress' },
  { id: 'demo-4', name: 'Development', order: 3, status: 'pending' },
  { id: 'demo-5', name: 'QA & Testing', order: 4, status: 'pending' },
  { id: 'demo-6', name: 'Launch', order: 5, status: 'pending' },
]

const DEMO_PREVIEWS = {
  'demo-1': {
    summary: 'Kickoff call held, scope and timeline signed off.',
    items: ['Kickoff call — Aug 4', 'Scope doc approved', 'Access to brand assets shared'],
  },
  'demo-2': {
    summary: 'Requirements sheet completed and locked in.',
    items: ['Storefront requirement sheet — 14 fields', 'Payment provider keys collected', 'Sitemap approved'],
  },
  'demo-3': {
    summary: 'Design in progress — homepage and PDP concepts drafted.',
    items: ['Homepage concept — v2 in review', 'Product page wireframe', 'Design system tokens drafted'],
  },
  'demo-4': {
    summary: 'Not started — queued behind design sign-off.',
    items: ['Storefront build', 'Checkout integration', 'CMS wiring'],
  },
  'demo-5': {
    summary: 'Not started.',
    items: ['Cross-browser test pass', 'Accessibility audit'],
  },
  'demo-6': {
    summary: 'Not started.',
    items: ['Go-live checklist', 'DNS cutover'],
  },
}

export default function InteractiveRoadmapDemo() {
  const [activeId, setActiveId] = useState(DEMO_STAGES[2].id)
  const active = DEMO_STAGES.find((s) => s.id === activeId)
  const preview = DEMO_PREVIEWS[activeId]

  return (
    <div className="w-full">
      <p className="text-center text-sm text-slate-light font-mono uppercase tracking-widest mb-6">
        This is the real interface — try clicking through a stage
      </p>
      <div className="bg-surface border border-line rounded-card shadow-card p-6 md:p-8 roadmap-demo-markers">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-progress" />
          <span className="text-sm font-semibold text-ink">{DEMO_PROJECT_NAME}</span>
          <span className="text-xs text-slate-light">(sample project)</span>
        </div>

        <RoadmapTimeline
          stages={DEMO_STAGES}
          activeStageId={activeId}
          onSelectStage={(s) => setActiveId(s.id)}
          orientation="horizontal"
        />

        {preview && (
          <div
            key={activeId}
            className="mt-8 pt-6 border-t border-line animate-[fadeSlideIn_320ms_ease-out]"
          >
            <h3 className="font-display text-base font-semibold text-ink mb-1">{active?.name}</h3>
            <p className="text-sm text-slate mb-4">{preview.summary}</p>
            <ul className="space-y-2">
              {preview.items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-ink">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Tactile hover on the roadmap's own stage markers, scoped to this
           marketing demo only — RoadmapTimeline.js is shared with the real
           dashboards, so this targets the rendered DOM by structure
           instead of touching that component. */
        .roadmap-demo-markers button {
          transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .roadmap-demo-markers button:hover > div:first-child {
          transform: scale(1.12);
          transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .roadmap-demo-markers button:hover > div:first-child {
            transform: none;
          }
        }
      `}</style>
    </div>
  )
}
