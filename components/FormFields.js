export function LabeledInput({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate mb-1 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface text-ink border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal"
      />
    </label>
  )
}

export function LabeledSelect({ label, value, onChange, options, empty }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal bg-surface"
      >
        <option value="">{options.length ? 'Select…' : empty}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </label>
  )
}
