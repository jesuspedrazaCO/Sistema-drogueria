import { RANGES } from '../lib/ranges.js';

// Rangos rápidos como "chips" horizontales (se pueden deslizar en móvil)
export function RangePicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Periodo" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
      {RANGES.map((range) => {
        const on = range.id === value;
        return (
          <button key={range.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(range.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${on ? 'bg-ink text-white' : 'bg-surface text-ink-soft shadow-card hover:bg-black/[0.03]'}`}>
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
