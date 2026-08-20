// Small "live" indicator — a colored dot with an expanding ping ring.
// Reserved for genuinely active/in-progress state, not decoration.
export default function PulseDot({ color }) {
  return (
    <span className="relative inline-flex w-1.5 h-1.5 flex-shrink-0">
      <span className="animate-ping absolute inline-flex w-full h-full rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex w-1.5 h-1.5 rounded-full" style={{ background: color }} />
    </span>
  )
}
