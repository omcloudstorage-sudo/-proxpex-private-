import { Frame, FileText, FileSpreadsheet, FileType2, Smartphone, Link2 } from 'lucide-react'

const ICONS = {
  figma: Frame,
  gdoc: FileText,
  sheet: FileSpreadsheet,
  pdf: FileType2,
  apk: Smartphone,
  other: Link2,
}

export default function LinkTypeIcon({ type, className }) {
  const Icon = ICONS[type] || Link2
  return <Icon className={className} strokeWidth={1.75} />
}
