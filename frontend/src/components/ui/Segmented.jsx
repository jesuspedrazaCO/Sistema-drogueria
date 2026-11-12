// Selector de opciones al estilo iOS (control segmentado)
export function Segmented({ label, value, onChange, options, className = '' }) {
  return (
    <div className={className} role="radiogroup" aria-label={label}>
      <div className="flex rounded-xl bg-black/[0.06] p-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-surface text-ink shadow-card' : 'text-ink-mute hover:text-ink'}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
