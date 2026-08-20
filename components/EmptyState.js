import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, text }) {
  return (
    <div className="bg-surface border border-line rounded-card shadow-card p-10 text-center">
      <Icon className="w-8 h-8 mx-auto mb-3 text-slate-light" strokeWidth={1.5} />
      <p className="text-sm text-slate">{text}</p>
    </div>
  )
}
