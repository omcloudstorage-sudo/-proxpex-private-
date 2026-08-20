import { Frame, FileText, FileSpreadsheet, FileType2, Smartphone, ScrollText, Link2 } from 'lucide-react'

const ICONS = {
  figma: Frame,
  gdoc: FileText,
  sheet: FileSpreadsheet,
  pdf: FileType2,
  apk: Smartphone,
  proposal: ScrollText,
  other: Link2,
}

export default function LinkTypeIcon({ type, className }) {
  const Icon = ICONS[type] || Link2
  return <Icon className={className} strokeWidth={1.75} />
}
