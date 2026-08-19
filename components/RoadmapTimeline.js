'use client'

import { Check } from 'lucide-react'
import { STATUS } from '@/lib/stages'

export default function RoadmapTimeline({ stages, activeStageId, onSelectStage }) {
  const sorted = [...stages].sort((a, b) => a.order - b.order)

  return (
    <div className="w-full">
      <div className="flex flex-col gap-8">
        {sorted.map((stage, i) => {
          const isLast = i === sorted.length - 1
          const isActive = stage.id === activeStageId
          const isDone = stage.status === STATUS.DONE
          const isCurrent = stage.status === STATUS.IN_PROGRESS

          return (
            <div key={stage.id} className="relative">
              {!isLast && (
                <div
                  className={[
                    'absolute left-6 top-12 w-0.5 h-8 -translate-x-1/2',
                    isDone ? 'bg-progress' : 'bg-line',
                  ].join(' ')}
                />
              )}
              <button onClick={() => onSelectStage?.(stage)} className="flex items-center gap-4 w-full text-left group">
                <div
                  className={[
                    'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 shadow-card transition-transform',
                    isDone && 'bg-progress border-white text-white',
                    isCurrent && !isDone && 'bg-white border-signal text-signal',
                    !isDone && !isCurrent && 'bg-white border-line text-slate',
                    isActive && 'ring-2 ring-offset-2 ring-signal/40',
                  ].filter(Boolean).join(' ')}
                >
                  {isDone ? <Check className="w-[18px] h-[18px]" strokeWidth={2.5} /> : <span className="text-base">{i + 1}</span>}
                </div>
                <span
                  className={[
                    'text-sm font-semibold leading-snug',
                    isDone ? 'text-progress' : isActive ? 'text-ink' : 'text-slate',
                  ].join(' ')}
                >
                  {stage.name}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
