import { resolvePriority } from '@/lib/priorityLibrary'

export default function PriorityBadge({ priorityId, library }) {
  const p = resolvePriority(priorityId, library)
  return (
    <span
      className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: `${p.color}1a`, color: p.color }}
    >
      {p.name}
    </span>
  )
}
