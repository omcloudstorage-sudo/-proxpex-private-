'use client'

import { Check } from 'lucide-react'
import { resolveStatusKind, getStatusDisplay, STATUS_KINDS } from '@/lib/statusLibrary'
import PulseDot from '@/components/PulseDot'

export default function RoadmapTimeline({ stages, activeStageId, onSelectStage, library }) {
  const sorted = [...stages].sort((a, b) => a.order - b.order)

  return (
    <div className="w-full">
      <div className="flex flex-col gap-8">
        {sorted.map((stage, i) => {
          const isLast = i === sorted.length - 1
          const isActive = stage.id === activeStageId
          const kind = resolveStatusKind(stage.status, library)
          const isDone = kind === STATUS_KINDS.DONE
          const isCurrent = kind === STATUS_KINDS.IN_PROGRESS
          const display = getStatusDisplay(stage.status, library)

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
              <button
                onClick={() => onSelectStage?.(stage)}
                className={[
                  'flex items-center gap-4 w-full text-left group rounded-xl -mx-2.5 px-2.5 py-2 transition-all duration-200 border',
                  isActive ? 'bg-signal/10 border-signal/30 shadow-card' : 'border-transparent',
                ].filter(Boolean).join(' ')}
              >
                <div
                  className={[
                    'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 shadow-card transition-all duration-200 ease-out',
                    isDone && 'bg-progress border-white text-white',
                    isCurrent && !isDone && 'bg-surface text-signal glow-pulse',
                    !isDone && !isCurrent && 'bg-surface border-line text-slate',
                    isActive && 'scale-[1.14] ring-[3px] ring-offset-2 ring-offset-paper ring-signal/55 shadow-glow',
                  ].filter(Boolean).join(' ')}
                  style={isCurrent && !isDone ? { borderColor: display.color, color: display.color } : undefined}
                >
                  {isDone ? <Check className="w-[18px] h-[18px]" strokeWidth={2.5} /> : <span className="text-base">{i + 1}</span>}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={[
                      'text-sm leading-snug truncate transition-all duration-200',
                      isActive ? 'font-bold text-ink' : 'font-semibold',
                      !isActive && (isDone ? 'text-progress' : 'text-slate'),
                    ].filter(Boolean).join(' ')}
                  >
                    {stage.name}
                  </span>
                  {!isDone && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${display.color}1a`, color: display.color }}
                    >
                      {isCurrent && <PulseDot color={display.color} />}
                      {display.name}
                    </span>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
