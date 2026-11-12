import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pill, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useDebounced } from '../hooks.js';

// Selector de producto con búsqueda (para filtros)
export function ProductPicker({ value, onChange, label = 'Filtrar por producto' }) {
  const [text, setText] = useState('');
  const debounced = useDebounced(text);
  const { data } = useQuery({
    queryKey: ['products', 'picker', debounced],
    queryFn: () => api.get('/products', { query: { search: debounced, limit: 6 } }),
    enabled: debounced.trim().length >= 2,
  });
  const results = data?.data.items ?? [];

  if (value) {
    return (
      <div className="flex h-12 items-center gap-3 rounded-xl bg-brand-50 px-4">
        <Pill className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{value.name}</span>
        <button type="button" onClick={() => onChange(null)} aria-label="Quitar producto" className="rounded-full p-1 text-ink-mute hover:bg-black/5">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-12 w-full rounded-xl bg-surface px-4 text-[15px] ring-1 ring-inset ring-black/10 placeholder:text-ink-mute/70 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {debounced.trim().length >= 2 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl bg-surface shadow-pop ring-1 ring-black/5">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-mute">Sin resultados</li>
          ) : (
            results.map((product) => (
              <li key={product.id}>
                <button type="button" onClick={() => { onChange(product); setText(''); }} className="block w-full px-4 py-2.5 text-left hover:bg-black/[0.04]">
                  <span className="block text-sm font-medium text-ink">{product.name}</span>
                  <span className="block text-xs text-ink-mute">{[product.presentation, product.brand].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
